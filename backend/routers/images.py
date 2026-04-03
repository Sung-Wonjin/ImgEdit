import os
import io
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image, ImageOps

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


@router.get("/browse")
def browse(folder: str = Query(..., description="탐색할 폴더 경로")):
    # WSL 환경에서 Windows 경로(C:\...) 가 넘어올 경우 변환
    folder = folder.replace("\\", "/")
    folder_path = Path(folder)
    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")

    dirs, files = [], []
    try:
        entries = sorted(
            folder_path.iterdir(),
            key=lambda p: (p.is_file(), p.name.lower())
        )
    except PermissionError:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    for entry in entries:
        try:
            name = entry.name  # Path는 내부적으로 UTF-8 str 사용
            if entry.is_dir():
                dirs.append({"name": name, "path": str(entry)})
            elif entry.suffix.lower() in SUPPORTED_EXTENSIONS:
                files.append({"name": name, "path": str(entry)})
        except (PermissionError, UnicodeDecodeError):
            continue

    parent = str(folder_path.parent) if folder_path.parent != folder_path else None
    parts = []
    p = folder_path
    while True:
        parts.insert(0, {"name": p.name or str(p), "path": str(p)})
        if p.parent == p:
            break
        p = p.parent

    # 이미지 파일에 UUID id 부여
    image_items = []
    for f in files:
        img_id = _get_image_id(f["path"])
        image_items.append({
            "id": img_id,
            "filename": f["name"],
            "path": f["path"],
        })

    return {
        "current": str(folder_path),
        "parent": parent,
        "breadcrumbs": parts,
        "dirs": dirs,
        "image_count": len(image_items),
        "images": image_items,
    }


@router.get("")
def list_images(folder: str = Query(..., description="이미지 폴더 경로")):
    folder = folder.replace("\\", "/")
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


def _open_with_exif(path: str) -> Image.Image:
    img = Image.open(path)
    return ImageOps.exif_transpose(img)


@router.get("/{image_id}")
def get_image(image_id: str):
    path = _image_cache.get(image_id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    img = _open_with_exif(path)
    fmt = Path(path).suffix.lstrip(".").upper() or "JPEG"
    if fmt == "JPG":
        fmt = "JPEG"
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return StreamingResponse(buf, media_type=f"image/{fmt.lower()}")


@router.get("/{image_id}/thumbnail")
def get_thumbnail(image_id: str, size: int = Query(200)):
    path = _image_cache.get(image_id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    img = _open_with_exif(path)
    img.thumbnail((size, size))
    fmt = Path(path).suffix.lstrip(".").upper() or "JPEG"
    if fmt == "JPG":
        fmt = "JPEG"
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return StreamingResponse(buf, media_type=f"image/{fmt.lower()}")
