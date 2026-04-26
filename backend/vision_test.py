import cv2
from ultralytics import YOLO

model = YOLO('yolov8n.pt')

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