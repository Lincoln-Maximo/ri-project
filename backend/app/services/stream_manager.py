import os
import time
import threading
import logging
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from ultralytics import YOLO
from app.services.face_handler import FaceIdentifier
from app.database.db_config import get_connection

from app.config_paths import STORAGE_DIR, EVENT_DIR, KNOWN_FACES_DIR, MODEL_PATH
from app.database.db_config import get_connection

logger = logging.getLogger(__name__)

_yolo_model = None
_face_identifier = None
_executor = ThreadPoolExecutor(max_workers=max(4, (os.cpu_count() or 4))) 

def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        if os.path.exists(MODEL_PATH):
            try:
                logger.info(f"Tentando carregar modelo YOLO de: {MODEL_PATH}")
                _yolo_model = YOLO(MODEL_PATH)
                logger.info("Modelo YOLO carregado com sucesso.")
            except Exception as e:
                logger.error(f"Erro crítico ao carregar modelo YOLO de {MODEL_PATH}: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            logger.error(f"Arquivo do modelo YOLO não encontrado em: {MODEL_PATH}")
    return _yolo_model

def get_face_identifier():
    global _face_identifier
    if _face_identifier is None and os.path.exists(KNOWN_FACES_DIR):
        try:
            _face_identifier = FaceIdentifier(KNOWN_FACES_DIR)
            logger.info("Identificador de faces inicializado.")
        except Exception as e:
            logger.error(f"Erro ao inicializar identificador de faces: {e}")
    return _face_identifier

class RTSPStreamManager:
    def __init__(self):
        self.streams = {}
        self.lock = threading.Lock()
        self.last_events = {} 
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()

    def _cleanup_loop(self):
        while True:
            time.sleep(5)
            with self.lock:
                now = time.time()
                to_remove = []
                for cam_id, info in self.streams.items():
                    if now - info.get("last_access", 0) > 15:
                        logger.info(f"Timeout de atividade na stream {cam_id}. Encerrando...")
                        info["running"] = False
                        to_remove.append(cam_id)
                
                for cam_id in to_remove:
                    del self.streams[cam_id]

    def refresh_face_identifier(self):
        with self.lock:
            if _face_identifier:
                _face_identifier.reload_faces(KNOWN_FACES_DIR)
                logger.info("Identificador de faces atualizado.")

    def save_event(self, cam_id, camera_db_id, name, frame, face_location, label, detections=None):
        logger.info(f"==> save_event INÍCIO: cam={cam_id}, db_id={camera_db_id}, name={name}, label={label}")
        if not camera_db_id: 
            logger.warning(f"Abortando: camera_db_id é None para cam={cam_id}")
            return
        
        now = time.time()
        
        conn = None
        try:
            # Verifica se o colaborador ainda existe
            colab_id = None
            if name != "Desconhecido":
                matricula = name.split('_')[0] if '_' in name else name
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT id FROM colaboradores WHERE matricula = %s", (matricula,))
                colab_res = cur.fetchone()
                if colab_res:
                    colab_id = colab_res[0]
                else:
                    logger.info(f"Colaborador {name} não encontrado no banco (provavelmente deletado).")
                    name = "Desconhecido"
            
            # Re-verificar se mudou para "Desconhecido"
            if name == "Desconhecido":
                event_key = f"{camera_db_id}_{now}_{label}"
            else:
                event_key = f"{camera_db_id}_{name}_{label}"
                
            if now - self.last_events.get(event_key, 0) < 60:
                logger.info(f"Abortando: rate limit 1min para {event_key}")
                return

            self.last_events[event_key] = now
            
            h, w = frame.shape[:2]
            frame_evidence = frame.copy()
            
            if detections:
                for det in detections:
                    x1, y1, x2, y2 = det["box"]
                    det_label, det_name = det["label"], det["display_name"]
                    
                    color = (0, 255, 0) if det.get("is_helmet", False) else (0, 0, 255)
                    cv2.rectangle(frame_evidence, (x1, y1), (x2, y2), color, 2)
                    
                    safe_label = det_label.replace("Ú", "U").replace("ú", "u")
                    conf = det.get("conf", 0) * 100
                    display_text = f"{det_name} | {safe_label.upper()} ({conf:.0f}%)"
                    
                    font = cv2.FONT_HERSHEY_DUPLEX
                    font_scale = 0.6
                    thickness = 1
                    (tw, th), _ = cv2.getTextSize(display_text, font, font_scale, thickness)
                    
                    cv2.rectangle(frame_evidence, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
                    cv2.putText(frame_evidence, display_text, (x1 + 4, y1 - 7), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

            # Thumbnail logic
            if name == "Desconhecido":
                # Para desconhecido, a miniatura é o recorte do rosto detectado
                thumb_filename = f"event_{int(now)}_{cam_id}.jpg"
                thumb_path = os.path.join(EVENT_DIR, thumb_filename)
                
                # Recorta o rosto detectado para a miniatura
                top, right, bottom, left = face_location
                h_roi, w_roi = frame.shape[:2]
                top_crop, bottom_crop = max(0, top - 20), min(h_roi, bottom + 20)
                left_crop, right_crop = max(0, left - 20), min(w_roi, right + 20)
                face_img = frame[top_crop:bottom_crop, left_crop:right_crop]
                cv2.imwrite(thumb_path, face_img)
                
                thumb_url = f"/event_images/{thumb_filename}"
                status_val = 'desconhecido'
            else:
                # Para conhecido, a miniatura é a foto cadastrada no banco
                # A foto cadastrada é buscada via endpoint /faces/{colab_id}/photo
                status_val = 'id_pendente'
                thumb_url = None # Será gerenciado pela UI via colab_id

            # O screenshot é sempre a imagem com a bounding box
            screenshot_filename = f"screenshot_{int(now)}_{cam_id}.jpg"
            screenshot_path = os.path.join(EVENT_DIR, screenshot_filename)
            cv2.imwrite(screenshot_path, frame_evidence)
            
            if not conn: conn = get_connection()
            cur = conn.cursor()
            
            cur.execute("SELECT setor_id FROM cameras WHERE id = %s", (camera_db_id,))
            cam_res = cur.fetchone()
            setor_id = cam_res[0] if cam_res else None
            
            # Tenta encontrar "Sem Capacete", senão usa qualquer tipo de violação
            cur.execute("SELECT id, nome FROM tipos_violacao WHERE LOWER(nome) LIKE '%sem capacete%' LIMIT 1")
            tv_res = cur.fetchone()
            
            if tv_res:
                tipo_violacao_id = tv_res[0]
                logger.info(f"Tipo de violação encontrado: {tv_res[1]} ({tipo_violacao_id})")
            else:
                # Fallback: pega qualquer tipo de violação com nível 'alto'
                cur.execute("SELECT id FROM tipos_violacao WHERE nivel_perigo = 'alto' LIMIT 1")
                tv_res = cur.fetchone()
                tipo_violacao_id = tv_res[0] if tv_res else None
                if tipo_violacao_id:
                    logger.warning(f"Tipo de violação 'Sem Capacete' não encontrado. Usando fallback: {tipo_violacao_id}")
                else:
                    logger.error("NENHUM tipo de violação disponível no banco de dados!")

            logger.info(f"Inserindo evento com miniatura (status={status_val}, tipo_violacao={tipo_violacao_id})...")
            
            if not tipo_violacao_id:
                logger.error("Abortando: tipo_violacao_id está NULL")
                return
            
            query = """
                INSERT INTO eventos (camera_id, colaborador_id, setor_id, tipo_violacao_id, ocorrido_em, miniatura_url, screenshot_url, status, nivel_risco)
                VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, 'alto')
            """
            cur.execute(query, (camera_db_id, colab_id, setor_id, tipo_violacao_id, thumb_url, screenshot_filename, status_val))
            conn.commit()
            logger.info("!!! EVENTO E MINIATURA GRAVADOS COM SUCESSO !!!")
            
        except Exception as e:
            if conn: conn.rollback()
            logger.error(f"ERRO NO SAVE_EVENT: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
        finally:
            if conn:
                cur.close()
                conn.close()
            logger.info("==> save_event FIM")

    def process_ia(self, cam_id, frame):
        logger.info(f"--- Processando IA para cam: {cam_id} ---")
        yolo = get_yolo_model()
        face_id = get_face_identifier()
        
        if not yolo or not face_id:
            logger.error(f"IA ou FaceID não carregados. yolo={yolo}, face_id={face_id}")
            return

        try:
            db_id = self.streams.get(cam_id, {}).get("db_id")
            logger.info(f"Iniciando detecção YOLO para cam: {cam_id}, db_id: {db_id}")
            
            results = yolo(frame, stream=False, conf=0.3, verbose=False)
            all_detections = []
            violations_found = []
            frame_h, frame_w = frame.shape[:2]

            for r in results:
                logger.info(f"YOLO detectou {len(r.boxes)} objetos.")
                for box in r.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls = int(box.cls[0])
                    raw_label = yolo.names[cls].strip().lower()
                    confidence = float(box.conf[0])

                    is_helmet = False
                    if 'with' in raw_label and 'without' not in raw_label:
                        if confidence > 0.85:
                            is_helmet = True
                            label_display = "COM CAPACETE"
                        else:
                            is_helmet = False
                            label_display = "SEM CAPACETE"
                    else:
                        is_helmet = False
                        label_display = "SEM CAPACETE"

                    # Ajuste fino: Bounding box mais próxima do rosto
                    largura, altura = x2 - x1, y2 - y1
                    top, bottom = max(0, y1), min(frame_h, y2 + int(altura * 1.5))
                    left, right = max(0, x1 + int(largura * 0.1)), min(frame_w, x2 - int(largura * 0.1))
                    face_location = (top, right, bottom, left)
                    
                    logger.info(f"Tentando identificar face em: {face_location}")
                    name = face_id.identify(frame, face_location)
                    logger.info(f"Face identificada como: {name}")
                    
                    import re
                    # Formatar nome para exibição: [Nome] - Matric: [Matrícula]
                    display_name = name
                    if "_" in name:
                        parts = name.split('_')
                        matricula = parts[0]
                        # Parte do nome (ex: "JorgeMendes")
                        raw_nome = parts[1] if len(parts) > 1 else "Desconhecido"
                        
                        # Tenta separar camelCase ("JorgeMendes" -> "Jorge Mendes")
                        nome_formatado = re.sub(r'(?<!^)(?=[A-Z])', ' ', raw_nome)
                        
                        display_name = f"{nome_formatado} - Matric: {matricula}"
                    
                    det_info = {
                        "box": (x1, y1, x2, y2),
                        "label": label_display,
                        "name": name,
                        "display_name": display_name,
                        "is_helmet": is_helmet,
                        "conf": confidence,
                        "face_location": face_location
                    }
                    all_detections.append(det_info)

                    if not is_helmet:
                        logger.info(f"Violação detectada: {name} sem capacete!")
                        violations_found.append(det_info)
            
            with self.lock:
                if cam_id in self.streams:
                    self.streams[cam_id]["detections"] = all_detections
                    logger.info(f"Estado da stream {cam_id} atualizado com {len(all_detections)} detecções.")

            for v in violations_found:
                logger.info(f"Tentando salvar evento de violação: cam_id={cam_id}, db_id={db_id}, name={v['name']}, label={v['label']}")
                self.save_event(
                    cam_id, 
                    db_id, 
                    v["name"], 
                    frame, 
                    v["face_location"], 
                    v["label"], 
                    detections=all_detections
                )

        except Exception as e:
            logger.error(f"Erro no processamento IA da stream {cam_id}: {e}")
            import traceback
            logger.error(traceback.format_exc())

    def process_ia_threaded(self, cam_id, frame):
        _executor.submit(self.process_ia, cam_id, frame.copy())

    def start_stream(self, camera_id: str, rtsp_url: str, db_id: str = None):
        with self.lock:
            if camera_id in self.streams:
                self.streams[camera_id]["last_access"] = time.time()
                if db_id: self.streams[camera_id]["db_id"] = db_id
                if self.streams[camera_id]["running"]:
                    return camera_id
            
            self.streams[camera_id] = {
                "frame": None,
                "running": True, 
                "rtsp_url": rtsp_url,
                "db_id": db_id,
                "last_access": time.time(),
                "error": False,
                "detections": []
            }

            def capture_loop(cam_id, url):
                logger.info(f"Iniciando captura: {cam_id}")
                cap = None
                try:
                    source = int(url) if url.isdigit() else url
                    for attempt in range(3):
                        cap = cv2.VideoCapture(source)
                        if cap.isOpened(): break
                        cap.release()
                        time.sleep(1)
                    
                    if not cap.isOpened():
                        logger.error(f"Falha definitiva ao abrir fonte: {url}")
                        with self.lock:
                            if cam_id in self.streams:
                                self.streams[cam_id]["error"] = True
                                self.streams[cam_id]["running"] = False
                        return

                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    last_ia_time = 0
                    
                    while True:
                        with self.lock:
                            if cam_id not in self.streams or not self.streams[cam_id]["running"]:
                                break
                        
                        success, frame = cap.read()
                        if success:
                            h, w = frame.shape[:2]
                            if w > 1920:
                                scale = 1920 / w
                                frame = cv2.resize(frame, (1920, int(h * scale)), interpolation=cv2.INTER_LINEAR)

                            now = time.time()
                            with self.lock:
                                if cam_id in self.streams:
                                    self.streams[cam_id]["frame"] = frame
                            
                            if now - last_ia_time > 5.0:
                                self.process_ia_threaded(cam_id, frame)
                                last_ia_time = now
                            time.sleep(0.001)
                        else:
                            time.sleep(0.01)
                    
                except Exception as e:
                    logger.error(f"Erro na captura {cam_id}: {e}")
                finally:
                    if cap: 
                        cap.release()
                        logger.info(f"Recurso de hardware liberado para: {cam_id}")
                    with self.lock:
                        if cam_id in self.streams:
                            self.streams[cam_id]["running"] = False

            threading.Thread(target=capture_loop, args=(camera_id, rtsp_url), daemon=True).start()
            return camera_id

    def stop_stream(self, camera_id: str):
        with self.lock:
            if camera_id in self.streams:
                logger.info(f"Parando stream {camera_id} via solicitação manual")
                self.streams[camera_id]["running"] = False


    def get_frame(self, camera_id: str, target_width: int = None):
        raw_frame = None
        detections = []
        with self.lock:
            stream = self.streams.get(camera_id)
            if stream and stream["running"] and stream["frame"] is not None:
                stream["last_access"] = time.time()
                raw_frame = stream["frame"] 
                detections = stream.get("detections", [])
        
        if raw_frame is None: return None

        h, w = raw_frame.shape[:2]
        if target_width and target_width < w:
            scale = target_width / w
            new_h = int(h * scale)
            frame = cv2.resize(raw_frame, (target_width, new_h), interpolation=cv2.INTER_LINEAR)
        else:
            frame = raw_frame.copy()
            scale = 1.0
        
        seen_boxes = []
        for det in detections:
            x1, y1, x2, y2 = [int(v * scale) for v in det["box"]]
            
            is_duplicate = False
            for (sx1, sy1, sx2, sy2) in seen_boxes:
                if abs(x1-sx1) < 15 and abs(y1-sy1) < 15:
                    is_duplicate = True
                    break
            if is_duplicate: continue
            seen_boxes.append((x1, y1, x2, y2))

            label, display_name = det["label"], det["display_name"]
            conf = det.get("conf", 0) * 100
            
            color = (0, 255, 0) if det.get("is_helmet", False) else (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            safe_label = label.replace("Ú", "U").replace("ú", "u")
            display_text = f"{display_name} | {safe_label} ({conf:.0f}%)"
            
            font = cv2.FONT_HERSHEY_DUPLEX
            font_scale = 0.45 if (target_width or w) < 600 else 0.6
            thickness = 1
            (tw, th), baseline = cv2.getTextSize(display_text, font, font_scale, thickness)
            
            cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
            cv2.putText(frame, display_text, (x1 + 4, y1 - 7), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
        
        return frame

    def is_running(self, camera_id: str):
        with self.lock:
            return self.streams.get(camera_id, {}).get("running", False)

stream_manager = RTSPStreamManager()
