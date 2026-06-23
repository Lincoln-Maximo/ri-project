import time
import asyncio
import cv2
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from app.routers.auth import get_optional_token_user
from app.services.stream_manager import stream_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/{camera_id}/stream/feed")
async def stream_feed(
    camera_id: str, 
    request: Request, 
    fps: int = Query(15), 
    width: int = Query(640),
    quality: int = Query(50),
    user_id: str = Depends(get_optional_token_user)
):
    if not stream_manager.is_running(camera_id): 
        raise HTTPException(status_code=404)
    
    async def gen():
        safe_fps = max(1, min(fps, 30))
        interval = 1.0 / safe_fps
        while stream_manager.is_running(camera_id):
            if await request.is_disconnected(): break
            
            start_time = time.time()
            f_small = stream_manager.get_frame(camera_id, target_width=width)
            
            if f_small is not None:
                try:
                    _, b = cv2.imencode(".jpg", f_small, [cv2.IMWRITE_JPEG_QUALITY, quality])
                    yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + b.tobytes() + b"\r\n")
                except Exception as e:
                    logger.error(f"Erro no encode da stream {camera_id}: {e}")
                    break
            
            elapsed = time.time() - start_time
            await asyncio.sleep(max(0, interval - elapsed))
                
    return StreamingResponse(
        gen(), 
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache", "Pragma": "no-cache", "Expires": "0"}
    )

@router.api_route("/{camera_id}/stream/stop", methods=["GET", "POST"])
async def parar_stream(camera_id: str, user_id: str = Depends(get_optional_token_user)):
    stream_manager.stop_stream(camera_id)
    return {"message": "Parado"}

@router.get("/{camera_id}/stream/heartbeat")
async def stream_heartbeat(camera_id: str, user_id: str = Depends(get_optional_token_user)):
    with stream_manager.lock:
        if camera_id in stream_manager.streams:
            stream_manager.streams[camera_id]["last_access"] = time.time()
            return {"status": "ok"}
    raise HTTPException(status_code=404)
