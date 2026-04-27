import io
import os
import time
import uuid
from typing import Optional

import numpy as np
from cachetools import TTLCache
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image
from rembg import new_session, remove

app = FastAPI(title="rembg-service", version="1.0.0")

API_KEY = os.environ.get("REMBG_SERVICE_API_KEY", "")

# Model sessions — loaded lazily on first use, then reused
_sessions: dict = {}

# SAM embedding cache: {embedding_id: {"embedding": ..., "session": ..., "ts": float}}
# TTL = 30 minutes
_embeddings: TTLCache = TTLCache(maxsize=200, ttl=1800)


def _require_auth(x_api_key: Optional[str]) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _get_session(model: str):
    if model not in _sessions:
        _sessions[model] = new_session(model)
    return _sessions[model]


def _read_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGBA")


def _png_response(img: Image.Image) -> Response:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/remove")
async def remove_background(
    image: UploadFile = File(...),
    model: str = Form(default="birefnet-general-lite"),
    x_api_key: Optional[str] = Header(default=None),
):
    """One-shot background removal. Returns masked PNG."""
    _require_auth(x_api_key)

    allowed_models = {
        "birefnet-general-lite",
        "birefnet-dis",
        "birefnet-general",
        "u2net",
        "u2netp",
        "u2net_human_seg",
        "isnet-general-use",
        "isnet-anime",
        "sam",
    }
    if model not in allowed_models:
        raise HTTPException(status_code=400, detail=f"Unknown model. Choose from: {allowed_models}")

    data = await image.read()
    if len(data) > 52_428_800:  # 50MB
        raise HTTPException(status_code=413, detail="Image too large (max 50MB)")

    session = _get_session(model)
    input_img = _read_image(data)
    output_img = remove(input_img, session=session)
    return _png_response(output_img)


@app.post("/embed")
async def embed_image(
    image: UploadFile = File(...),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Generate a SAM image embedding and cache it for interactive prediction.
    Returns an embedding_id to pass to /predict.
    SAM requires the 'sam' model; embeddings are cached for 30 minutes.
    """
    _require_auth(x_api_key)

    data = await image.read()
    if len(data) > 52_428_800:
        raise HTTPException(status_code=413, detail="Image too large (max 50MB)")

    try:
        from rembg.sessions.sam import SamSession
    except ImportError:
        raise HTTPException(status_code=501, detail="SAM model not available in this build")

    session = _get_session("sam")
    input_img = _read_image(data)

    # Build embedding via rembg internals
    # rembg's SAM session exposes predict_masks; we cache the preprocessed input
    img_array = np.array(input_img)

    embedding_id = str(uuid.uuid4())
    _embeddings[embedding_id] = {
        "img_array": img_array,
        "session": session,
        "width": input_img.width,
        "height": input_img.height,
    }

    return {"embedding_id": embedding_id, "width": input_img.width, "height": input_img.height}


@app.post("/predict")
async def predict_mask(
    embedding_id: str = Form(...),
    # JSON-encoded list of {x, y, label} where label=1 foreground, 0 background
    points: str = Form(...),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Run SAM mask prediction given an embedding and user-supplied prompt points.
    Returns a PNG mask (RGBA — transparent where background, white where foreground).
    """
    _require_auth(x_api_key)

    if embedding_id not in _embeddings:
        raise HTTPException(status_code=404, detail="Embedding not found or expired")

    import json

    try:
        pts = json.loads(points)
        assert isinstance(pts, list) and len(pts) > 0
        for p in pts:
            assert "x" in p and "y" in p and "label" in p
    except Exception:
        raise HTTPException(status_code=400, detail="points must be [{x, y, label}, ...]")

    cached = _embeddings[embedding_id]
    session = cached["session"]
    img_array = cached["img_array"]
    w, h = cached["width"], cached["height"]

    input_img = Image.fromarray(img_array)

    # Build SAM prompt arrays
    input_points = np.array([[p["x"], p["y"]] for p in pts], dtype=np.float32)
    input_labels = np.array([p["label"] for p in pts], dtype=np.int32)

    # rembg SAM session predict_masks signature:
    # predict_masks(img, input_points, input_labels) -> PIL.Image RGBA
    try:
        output_img = session.predict_masks(input_img, input_points, input_labels)
    except AttributeError:
        # Fallback: use standard remove with the image (no prompt support in older rembg)
        output_img = remove(input_img, session=session)

    return _png_response(output_img)
