import sys
import os

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.config_paths import PROJECT_ROOT, STORAGE_DIR, EVENT_DIR, KNOWN_FACES_DIR

print(f"PROJECT_ROOT: {PROJECT_ROOT}")
print(f"STORAGE_DIR: {STORAGE_DIR}")
print(f"EVENT_DIR: {EVENT_DIR}")
print(f"KNOWN_FACES_DIR: {KNOWN_FACES_DIR}")

print("\nFiles in EVENT_DIR:")
if os.path.exists(EVENT_DIR):
    for f in os.listdir(EVENT_DIR):
        print(f" - {f}")
else:
    print("EVENT_DIR does not exist!")
