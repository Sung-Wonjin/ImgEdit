from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import images, editor

app = FastAPI(title="ImgEdit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(editor.router, prefix="/api/editor", tags=["editor"])


@app.get("/health")
def health():
    return {"status": "ok"}
