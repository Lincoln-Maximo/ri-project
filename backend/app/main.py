import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, "../../.env"))
load_dotenv(os.path.join(BASE_DIR, "../.env"))


from app.config_paths import STORAGE_DIR, EVENT_DIR, KNOWN_FACES_DIR
from app.routers import auth, cameras, faces, eventos, dashboard, stream, setores

app = FastAPI(title="Real Intelligence API")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/profile_pictures", StaticFiles(directory=STORAGE_DIR), name="profile_pictures")
app.mount("/event_images", StaticFiles(directory=EVENT_DIR), name="event_images")
app.mount("/known_faces", StaticFiles(directory=KNOWN_FACES_DIR), name="known_faces")

app.include_router(auth.router, prefix="", tags=["Auth"])
app.include_router(cameras.router, prefix="/cameras", tags=["Cameras"])
app.include_router(faces.router, prefix="/faces", tags=["Faces"])
app.include_router(eventos.router, prefix="/eventos", tags=["Eventos"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(stream.router, prefix="/cameras", tags=["Stream"])
app.include_router(setores.router, prefix="/setores", tags=["Setores"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
