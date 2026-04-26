import cv2
from ultralytics import YOLO
import sys

print("Iniciando carregamento do YOLO...")
try:
    # Carrega o modelo nano (mais leve)
    model = YOLO('yolov8n.pt') 
    print("Modelo carregado com sucesso.")
except Exception as e:
    print(f"Erro ao carregar o modelo: {e}")
    sys.exit(1)

# Tenta abrir a webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("\nERRO: Webcam nao encontrada!")
    print("Verifique se a camera esta conectada ou se outro programa (Meet, Zoom, etc) esta usando-a.")
    sys.exit(1)

print("\n--- TESTE INICIADO ---")
print("1. Uma janela de video deve abrir na sua tela.")
print("2. O YOLO vai detectar objetos automaticamente.")
print("3. Pressione a tecla 'Q' na janela do video para sair.")

while True:
    success, frame = cap.read()
    if success:
        # Executa a deteccao (conf=0.5 para evitar falsos positivos)
        results = model(frame, conf=0.5)
        
        # Desenha as caixas de deteccao
        annotated_frame = results[0].plot()
        
        # Exibe o resultado
        cv2.imshow("Monitoramento RI Project - Teste YOLO", annotated_frame)
        
        # Espera pela tecla 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    else:
        print("Erro ao capturar imagem da webcam.")
        break

cap.release()
cv2.destroyAllWindows()
print("Teste finalizado com sucesso.")
