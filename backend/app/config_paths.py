import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))


STORAGE_DIR = os.path.join(PROJECT_ROOT, "storage", "uploads", "avatars")
EVENT_DIR = os.path.join(PROJECT_ROOT, "storage", "uploads", "events")
KNOWN_FACES_DIR = os.path.join(PROJECT_ROOT, "backend", "known_faces")
MODEL_PATH = os.path.join(PROJECT_ROOT, "backend", "models", "best.pt")

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(EVENT_DIR, exist_ok=True)
os.makedirs(KNOWN_FACES_DIR, exist_ok=True)
