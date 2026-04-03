import io
import base64
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from PIL import Image, ImageEnhance
from pydantic import BaseModel

router = APIRouter()


def _open_image(image_path: str) -> Image.Image:
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    return Image.open(image_path)


def _image_to_response(img: Image.Image, fmt: str = "JPEG") -> StreamingResponse:
    buf = io.BytesIO()
    if fmt.upper() == "JPG":
        fmt = "JPEG"
    img.save(buf, format=fmt.upper())
    buf.seek(0)
    return StreamingResponse(buf, media_type=f"image/{fmt.lower()}")


class RotateRequest(BaseModel):
    image_path: str
    angle: float


class CropRequest(BaseModel):
    image_path: str
    x: int
    y: int
    width: int
    height: int


class AdjustRequest(BaseModel):
    image_path: str
    brightness: float = 1.0
    contrast: float = 1.0


class ResizeRequest(BaseModel):
    image_path: str
    width: int
    height: int


class SaveRequest(BaseModel):
    image_path: str
    image_data: str  # base64
    overwrite: bool = False
    output_path: str = ""


@router.post("/rotate")
def rotate(req: RotateRequest):
    img = _open_image(req.image_path)
    rotated = img.rotate(-req.angle, expand=True)
    fmt = Path(req.image_path).suffix.lstrip(".") or "jpeg"
    return _image_to_response(rotated, fmt)


@router.post("/crop")
def crop(req: CropRequest):
    img = _open_image(req.image_path)
    box = (req.x, req.y, req.x + req.width, req.y + req.height)
    cropped = img.crop(box)
    fmt = Path(req.image_path).suffix.lstrip(".") or "jpeg"
    return _image_to_response(cropped, fmt)


@router.post("/adjust")
def adjust(req: AdjustRequest):
    img = _open_image(req.image_path)
    if req.brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(req.brightness)
    if req.contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(req.contrast)
    fmt = Path(req.image_path).suffix.lstrip(".") or "jpeg"
    return _image_to_response(img, fmt)


@router.post("/resize")
def resize(req: ResizeRequest):
    img = _open_image(req.image_path)
    resized = img.resize((req.width, req.height), Image.LANCZOS)
    fmt = Path(req.image_path).suffix.lstrip(".") or "jpeg"
    return _image_to_response(resized, fmt)


@router.post("/save")
def save(req: SaveRequest):
    image_data = base64.b64decode(req.image_data)
    img = Image.open(io.BytesIO(image_data))

    if req.overwrite:
        save_path = req.image_path
    elif req.output_path:
        save_path = req.output_path
    else:
        p = Path(req.image_path)
        save_path = str(p.parent / f"{p.stem}_edited{p.suffix}")

    img.save(save_path)
    return {"saved_path": save_path}
