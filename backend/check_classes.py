from ultralytics import YOLO

# Carrega o modelo que você baixou
model = YOLO('models/best.pt')

# Imprime o dicionário de classes
print("\n--- MAPEAMENTO DE CLASSES ---")
print(model.names)
print("-----------------------------\n")