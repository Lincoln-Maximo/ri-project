import cv2
from ultralytics import YOLO
from services.face_handler import FaceIdentifier


MODEL_PATH = 'models/best.pt'
KNOWN_FACES_DIR = 'known_faces'
CONFIDENCE_THRESHOLD = 0.5
WINDOW_NAME = "Segurança no Trabalho - Detecção de Capacetes"

model = YOLO(MODEL_PATH)
face_id = FaceIdentifier(KNOWN_FACES_DIR)

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Erro: Não foi possível abrir a webcam.")
    exit()

print("Pressione 'q' para sair.")

while True:
    success, frame = cap.read()
    if not success:
        print("Aviso: Falha ao capturar frame.")
        break

    frame_h, frame_w = frame.shape[:2]


    results = model(frame, stream=True, conf=0.3)

    for r in results:
        # lista de detecções válidas para este frame
        detections = []
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = int(box.cls[0])
            label = model.names[cls].strip().lower()
            confidence = float(box.conf[0])
            detections.append({'box': (x1, y1, x2, y2), 'label': label, 'conf': confidence})

        for det in detections:
            x1, y1, x2, y2 = det['box']
            label = det['label']
            confidence = det['conf']


            is_helmet = False
            if 'with helmet' in label and confidence >= 0.80:
                is_helmet = True
                status_text = "OK"
                color = (0, 255, 0)
            else:
                status_text = "SEM CAPACETE"
                color = (0, 0, 255)


            largura = x2 - x1
            altura  = y2 - y1
            top    = max(0, y1)
            bottom = min(frame_h, y2 + int(altura * 2.5))
            left   = max(0, x1 - int(largura * 0.5))
            right  = min(frame_w, x2 + int(largura * 0.5))

            face_location = (top, right, bottom, left)
            name = face_id.identify(frame, face_location)


            if name == "Desconhecido" and not is_helmet and confidence < 0.4:
                continue
            

            if is_helmet:
                print(f"[LOG] {name}: STATUS OK - Capacete confirmado ({confidence:.2f})")
            else:
                motivo = "Baixa Confiança" if 'with' in label else "Detectado pelo Modelo"
                print(f"[ALERTA] {name}: SEM CAPACETE - Motivo: {motivo} ({confidence:.2f})")


            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            display_text = f"{status_text}: {name} ({confidence:.0%})"
            
            font = cv2.FONT_HERSHEY_DUPLEX
            font_scale = 0.6
            thickness = 1
            (text_w, text_h), _ = cv2.getTextSize(display_text, font, font_scale, thickness)
            
            cv2.rectangle(frame, (x1, y1 - text_h - 14), (x1 + text_w + 8, y1), color, -1)
            cv2.putText(frame, display_text, (x1 + 4, y1 - 7),
                        font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)


    fps = cap.get(cv2.CAP_PROP_FPS)
    cv2.putText(frame, f"FPS: {fps:.0f}", (10, 30),
                cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 0), 2, cv2.LINE_AA)

    cv2.imshow(WINDOW_NAME, frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()