import cv2
from ultralytics import YOLO
from services.face_handler import FaceIdentifier

# 1. Configurações
MODEL_PATH = 'yolov8n.pt'       # Trocar por modelo de capacete futuramente
KNOWN_FACES_DIR = 'backend/known_faces'
CONFIDENCE_THRESHOLD = 0.5
WINDOW_NAME = "Monitoramento de Seguranca"

model = YOLO(MODEL_PATH)
face_id = FaceIdentifier(KNOWN_FACES_DIR)
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Erro: Não foi possível abrir a webcam.")
    exit()

print("Pressione 'q' ou feche a janela para sair.")

while True:
    success, frame = cap.read()
    if not success:
        print("Aviso: Falha ao capturar frame.")
        break

    # 2. YOLO detecta objetos
    results = model(frame, stream=True, conf=CONFIDENCE_THRESHOLD)

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = int(box.cls[0])
            label = model.names[cls]
            confidence = float(box.conf[0])

            # 3. Lógica de Segurança
            if label == 'person':
                name = face_id.identify(frame, (y1, x2, y2, x1))
                is_known = name not in ("Desconhecido", "Nao detectado")

                color = (0, 255, 0) if is_known else (0, 0, 255)

                # Caixa ao redor da pessoa
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Label com nome e confiança
                display_text = f"{'Func' if is_known else '??'}: {name} ({confidence:.0%})"
                
                # Fundo escuro atrás do texto para melhor leitura
                (text_w, text_h), _ = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                cv2.rectangle(frame, (x1, y1 - text_h - 14), (x1 + text_w, y1), color, -1)
                cv2.putText(frame, display_text, (x1, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    # FPS no canto da tela
    fps = cap.get(cv2.CAP_PROP_FPS)
    cv2.putText(frame, f"FPS: {fps:.0f}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    cv2.imshow(WINDOW_NAME, frame)

    # Sai com 'q' ou fechando a janela pelo X
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
    if cv2.getWindowProperty(WINDOW_NAME, cv2.WND_PROP_VISIBLE) < 1:
        break

cap.release()
cv2.destroyAllWindows()