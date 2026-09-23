import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis

class FaceIdentifier:
    def __init__(self, known_faces_dir):
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])


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

                # compara com face
                faces = self.app.get(img)

                if len(faces) > 0:
                    faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)
                    self.known_embeddings.append(faces[0].normed_embedding)
                    self.known_names.append(os.path.splitext(filename)[0])
                else:
                    print(f"Aviso: Nenhum rosto encontrado em '{filename}'")

        print(f"Base de dados carregada com sucesso: {self.known_names}")

    def reload_faces(self, directory):
        self.known_embeddings = []
        self.known_names = []
        self.load_known_faces(directory)

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

    
        roi = frame[top:bottom, left:right]
        if roi.size == 0:
            return "Erro de imagem"

        # InsightFace analisa a ROI
        faces = self.app.get(roi)

        if not faces:
            return "Desconhecido"

        current_embedding = faces[0].normed_embedding


        similarities = [np.dot(current_embedding, known) for known in self.known_embeddings]

        if not similarities:
            return "Desconhecido"

        best_match_idx = np.argmax(similarities)
        score = similarities[best_match_idx]


        print(f"Similaridade detectada: {score:.2f}")
        if score > 0.50:
            return self.known_names[best_match_idx]

        return "Desconhecido"