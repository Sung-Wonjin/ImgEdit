from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import images, editor
import os
import sys

# 한글 경로 등 유니코드 처리
if sys.platform == 'linux':
    import locale
    try:
        locale.setlocale(locale.LC_ALL, 'ko_KR.UTF-8')
    except locale.Error:
        pass

app = FastAPI(title="ImgEdit API")

app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(editor.router, prefix="/api/editor", tags=["editor"])

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
