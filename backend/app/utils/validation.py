import os
from fastapi import HTTPException, UploadFile
from PIL import Image

MAX_FILE_SIZE = 5 * 1024 * 1024  
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"]

async def validate_image(file: UploadFile):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Apenas arquivos JPEG ou PNG são permitidos.")
    
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0) 
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo de 5MB.")
        

    try:
        img = Image.open(file.file)
        img.verify() 
        file.file.seek(0) 
    except Exception:
        raise HTTPException(status_code=400, detail="Arquivo de imagem inválido ou corrompido.")
