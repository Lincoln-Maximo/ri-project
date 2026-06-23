from ultralytics import YOLO

model = YOLO('models/best.pt')

print("\n--- MAPEAMENTO DE CLASSES ---")
print(model.names)
print("-----------------------------\n")