import os
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from PIL import Image

router = APIRouter()

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}

# 세션 내 이미지 경로 캐시 {id: path}
_image_cache: dict[str, str] = {}


def _get_image_id(path: str) -> str:
    for img_id, img_path in _image_cache.items():
        if img_path == path:
            return img_id
    img_id = str(uuid.uuid4())
    _image_cache[img_id] = path
    return img_id


@router.get("")
def list_images(folder: str = Query(..., description="이미지 폴더 경로")):
    folder_path = Path(folder)
    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")

    images = []
    for file in sorted(folder_path.iterdir()):
        if file.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        try:
            with Image.open(file) as img:
                width, height = img.size
        except Exception:
            continue

        img_id = _get_image_id(str(file))
        images.append({
            "id": img_id,
            "filename": file.name,
            "path": str(file),
            "width": width,
            "height": height,
            "size": file.stat().st_size,
        })

    return {"folder": str(folder_path), "images": images}


@router.get("/{image_id}")
def get_image(image_id: str):
    path = _image_cache.get(image_id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    return FileResponse(path)


@router.get("/{image_id}/thumbnail")
def get_thumbnail(image_id: str, size: int = Query(200)):
    path = _image_cache.get(image_id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    img = Image.open(path)
    img.thumbnail((size, size))

    import io
    buf = io.BytesIO()
    fmt = img.format or "JPEG"
    img.save(buf, format=fmt)
    buf.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(buf, media_type=f"image/{fmt.lower()}")
