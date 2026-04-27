import face_recognition
import os
import cv2
import numpy as np

class FaceIdentifier:
    def __init__(self, known_faces_dir):
        self.known_encodings = []
        self.known_names = []
        self.load_known_faces(known_faces_dir)

    def load_known_faces(self, directory):
        if not os.path.exists(directory):
            print(f"Erro: Diretório '{directory}' não encontrado.")
            return

        for filename in os.listdir(directory):
            if filename.endswith((".jpg", ".png", ".jpeg")):
                filepath = os.path.join(directory, filename)
                image = face_recognition.load_image_file(filepath)
                encodings = face_recognition.face_encodings(image)

                if len(encodings) == 0:
                    print(f"Aviso: Nenhum rosto encontrado em '{filename}', ignorando.")
                    continue

                self.known_encodings.append(encodings[0])
                self.known_names.append(os.path.splitext(filename)[0])

        print(f"Base de dados carregada: {self.known_names}")

    def identify(self, frame, face_location):
        top, right, bottom, left = face_location

        # Converte frame de BGR (OpenCV) para RGB (face_recognition)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # DEBUG: Verifica se o encoding está sendo gerado
        face_encodings = face_recognition.face_encodings(rgb_frame, [(top, right, bottom, left)])

        if not face_encodings:
            # Se cair aqui, o recorte está ruim e não há rosto visível nele
            return "Rosto nao focado"

        face_distances = face_recognition.face_distance(self.known_encodings, face_encodings[0])
        best_match_index = np.argmin(face_distances)

        # DEBUG: Quanto menor a distância, mais parecido. Abaixo de 0.65 considera reconhecido
        print(f"Distancia detectada: {face_distances[best_match_index]:.2f}")

        if face_distances[best_match_index] < 0.65:
            return self.known_names[best_match_index]

        return "Desconhecido"