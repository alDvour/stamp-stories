import os
import secrets
import uuid
from pathlib import Path
from typing import Annotated
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Collectible
from .schemas import CollectibleDetail, CollectibleSummary

load_dotenv()
ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "8"))
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
if not ADMIN_TOKEN or ADMIN_TOKEN == "replace-this-with-a-long-random-secret":
    print("WARNING: Set a strong ADMIN_TOKEN in backend/.env before using the public deployment.")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collectible Stories API", version="1.0.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-tau-five-98.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def require_admin(x_admin_token: Annotated[str | None, Header()] = None):
    if not ADMIN_TOKEN or not x_admin_token or not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="A valid admin token is required.")

def image_url(filename: str) -> str:
    return f"/uploads/{filename}"

def summary(item: Collectible) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "image_url": image_url(item.image_filename),
        "created_at": item.created_at,
    }

def detail(item: Collectible) -> dict:
    return {**summary(item), "description": item.description}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/collectibles", response_model=list[CollectibleSummary])
def list_collectibles(db: Session = Depends(get_db)):
    items = db.query(Collectible).order_by(Collectible.created_at.desc(), Collectible.id.desc()).all()
    return [summary(item) for item in items]

@app.get("/api/collectibles/{collectible_id}", response_model=CollectibleDetail)
def get_collectible(collectible_id: int, db: Session = Depends(get_db)):
    item = db.get(Collectible, collectible_id)
    if not item:
        raise HTTPException(status_code=404, detail="Collectible not found.")
    return detail(item)

@app.post("/api/collectibles", response_model=CollectibleDetail, status_code=201)
async def create_collectible(
    title: Annotated[str, Form(min_length=1, max_length=160)],
    description: Annotated[str, Form(min_length=1, max_length=10000)],
    image: Annotated[UploadFile, File()],
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    title = title.strip()
    description = description.strip()
    if not title or not description:
        raise HTTPException(status_code=422, detail="Title and description cannot be blank.")

    content_type = (image.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, WEBP, or GIF image.")

    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image must be smaller than {MAX_UPLOAD_MB} MB.")

    # Validate actual image contents rather than trusting only the file extension/type.
    try:
        from io import BytesIO
        with Image.open(BytesIO(data)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=415, detail="That file doesn't appear to be a valid image.")

    extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}[content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    path = UPLOAD_DIR / filename
    path.write_bytes(data)
    item = Collectible(title=title, description=description, image_filename=filename)
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return detail(item)

@app.delete("/api/collectibles/{collectible_id}", status_code=204)
def delete_collectible(
    collectible_id: int,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.get(Collectible, collectible_id)
    if not item:
        raise HTTPException(status_code=404, detail="Collectible not found.")
    image_path = UPLOAD_DIR / item.image_filename
    db.delete(item)
    db.commit()
    image_path.unlink(missing_ok=True)
    return None
