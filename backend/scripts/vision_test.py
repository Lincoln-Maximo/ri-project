import sys
import os
import cv2
from ultralytics import YOLO


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'yolov8n.pt')
model = YOLO(model_path)

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Erro: Não foi possível abrir a webcam.")
    exit()

print("Pressione 'q' para sair. ")

while True:
    success, frame = cap.read()

    if success:
        results = model(frame, conf=0.5)
        annotated_frame = results[0].plot()
        cv2.imshow("Teste YOLO", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    else:
        break

cap.release()
cv2.destroyAllWindows()