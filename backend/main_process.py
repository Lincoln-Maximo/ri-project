import cv2
from ultralytics import YOLO
from services.face_handler import FaceIdentifier

# 1. Configurações
MODEL_PATH = 'models/best.pt'
KNOWN_FACES_DIR = 'known_faces'
CONFIDENCE_THRESHOLD = 0.7
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

    # 2. YOLO detecta objetos
    results = model(frame, stream=True, conf=CONFIDENCE_THRESHOLD)

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = int(box.cls[0])
            label = model.names[cls].strip()
            confidence = float(box.conf[0])

            # 3. Lógica de cores
            if label == 'Without helmet':
                color = (0, 0, 255)
                status_text = "SEM CAPACETE"
            else:
                color = (0, 255, 0)
                status_text = "OK"

            # 4. Área do rosto: quadrada e maior, descendo 2.5x a altura da cabeça detectada
            largura = x2 - x1
            altura  = y2 - y1

            top    = max(0, y1)
            bottom = min(frame_h, y2 + int(altura * 2.5))
            left   = max(0, x1 - int(largura * 0.5))
            right  = min(frame_w, x2 + int(largura * 0.5))

            # Ordem para reconhecer face: (Top, Right, Bottom, Left)
            face_location = (top, right, bottom, left)
            name = face_id.identify(frame, face_location)

            # 5. Caixa colorida da detecção YOLO
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # 6. Caixa branca fina mostrando a área de busca facial
            cv2.rectangle(frame, (left, top), (right, bottom), (255, 255, 255), 1)

            # 7. Texto com status e nome
            display_text = f"{status_text}: {name} ({confidence:.0%})"
            (text_w, text_h), _ = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(frame, (x1, y1 - text_h - 14), (x1 + text_w, y1), color, -1)
            cv2.putText(frame, display_text, (x1, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    # 8. FPS no canto da tela
    fps = cap.get(cv2.CAP_PROP_FPS)
    cv2.putText(frame, f"FPS: {fps:.0f}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    cv2.imshow(WINDOW_NAME, frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()