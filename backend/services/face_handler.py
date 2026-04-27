import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis

class FaceIdentifier:
    def __init__(self, known_faces_dir):
        # name='buffalo_l' baixa o modelo de alta precisão
        # providers=['CPUExecutionProvider'] garante o uso apenas da CPU
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])

        # Prepara o modelo (ctx_id=-1 força CPU, 0 seria a primeira GPU)
        self.app.prepare(ctx_id=-1, det_size=(640, 640))

        self.known_embeddings = []
        self.known_names = []
        self.load_known_faces(known_faces_dir)

    def load_known_faces(self, directory):
        if not os.path.exists(directory):
            print(f"Erro: Diretório '{directory}' não encontrado.")
            return

        print("Carregando base de faces com InsightFace (Modelo Buffalo_L)...")
        for filename in os.listdir(directory):
            if filename.endswith((".jpg", ".png", ".jpeg")):
                filepath = os.path.join(directory, filename)
                img = cv2.imread(filepath)

                # O InsightFace detecta e analisa o rosto na foto de cadastro
                faces = self.app.get(img)

                if len(faces) > 0:
                    # Ordena por tamanho para pegar o rosto principal se houver mais de um
                    faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)
                    self.known_embeddings.append(faces[0].normed_embedding)
                    self.known_names.append(os.path.splitext(filename)[0])
                else:
                    print(f"Aviso: Nenhum rosto encontrado em '{filename}'")

        print(f"Base de dados carregada com sucesso: {self.known_names}")

    def identify(self, frame, face_location):
        """
        Identifica o rosto na área especificada.
        face_location: (top, right, bottom, left) vindo do YOLO
        """
        top, right, bottom, left = face_location

        # Garante que as coordenadas estão dentro do frame para o recorte
        h, w = frame.shape[:2]
        top, bottom = max(0, top), min(h, bottom)
        left, right  = max(0, left), min(w, right)

        # Recorta a região de interesse (ROI) para acelerar a CPU
        roi = frame[top:bottom, left:right]
        if roi.size == 0:
            return "Erro de imagem"

        # InsightFace analisa a ROI
        faces = self.app.get(roi)

        if not faces:
            return "Desconhecido"

        # Pega o embedding do rosto detectado
        current_embedding = faces[0].normed_embedding

        # Calcula a similaridade de cosseno (0 a 1)
        # Diferente da distância (onde menor é melhor), aqui quanto MAIOR melhor
        similarities = [np.dot(current_embedding, known) for known in self.known_embeddings]

        if not similarities:
            return "Desconhecido"

        best_match_idx = np.argmax(similarities)
        score = similarities[best_match_idx]

        # Limiar de confiança para Buffalo_L em CPU:
        # 0.4 a 0.5: Provável / 0.6+: Certeza
        print(f"Similaridade detectada: {score:.2f}")
        if score > 0.45:
            return self.known_names[best_match_idx]

        return "Desconhecido"