import io
import json
import os
import uuid
from collections import deque
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


def _flood_fill_white_removal(img: Image.Image, threshold: int = 240) -> Image.Image:
    """
    BFS flood-fill from every edge pixel to remove connected near-white regions.

    This is the key step for DTF transfers: the ML model correctly finds the
    outer silhouette but leaves interior white fill areas (gaps between petals,
    negative space inside letters) as opaque. Those white areas are connected
    to the image border through tiny gaps, so a flood-fill from the edges
    reaches and removes them while preserving truly isolated white highlights
    that are completely surrounded by colored design elements.

    threshold: RGB value above which a pixel is considered "near-white". 240
    catches creamy/off-white edges from watercolor art without removing
    intentional light-color design elements.
    """
    rgba = np.array(img, dtype=np.uint8)
    h, w = rgba.shape[:2]

    r, g, b, a = rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2], rgba[:, :, 3]

    # A pixel qualifies for removal if it's near-white (or already transparent)
    removable = (
        ((r >= threshold) & (g >= threshold) & (b >= threshold)) | (a < 10)
    )

    visited = np.zeros((h, w), dtype=bool)
    queue: deque = deque()

    # Seed BFS from every edge pixel that qualifies
    for x in range(w):
        for row in (0, h - 1):
            if removable[row, x] and not visited[row, x]:
                visited[row, x] = True
                queue.append((row, x))
    for y in range(1, h - 1):
        for col in (0, w - 1):
            if removable[y, col] and not visited[y, col]:
                visited[y, col] = True
                queue.append((y, col))

    # 4-connected BFS
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and removable[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    # Zero-out alpha for every visited pixel
    result = rgba.copy()
    result[visited, 3] = 0
    return Image.fromarray(result, "RGBA")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/remove")
async def remove_background(
    image: UploadFile = File(...),
    model: str = Form(default="birefnet-general-lite"),
    post_process_white: bool = Form(default=True),
    white_threshold: int = Form(default=240),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    One-shot background removal. Returns masked PNG.

    post_process_white: run flood-fill white removal after ML mask (recommended
      for DTF transfers — removes interior white fill areas the ML model misses).
    white_threshold: RGB threshold for "near-white" detection (0-255, default 240).
    """
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
        "white-fill",  # skip ML entirely, flood-fill only
    }
    if model not in allowed_models:
        raise HTTPException(status_code=400, detail=f"Unknown model. Choose from: {allowed_models}")

    if not (0 <= white_threshold <= 255):
        raise HTTPException(status_code=400, detail="white_threshold must be 0-255")

    data = await image.read()
    if len(data) > 52_428_800:  # 50MB
        raise HTTPException(status_code=413, detail="Image too large (max 50MB)")

    input_img = _read_image(data)

    if model == "white-fill":
        # Skip ML entirely — pure flood-fill from edges. Fast and accurate for
        # solid white or near-white background images (most DTF art).
        output_img = _flood_fill_white_removal(input_img, threshold=white_threshold)
    else:
        session = _get_session(model)
        output_img = remove(input_img, session=session)

        if post_process_white:
            output_img = _flood_fill_white_removal(output_img, threshold=white_threshold)

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
        from rembg.sessions.sam import SamSession  # noqa: F401
    except ImportError:
        raise HTTPException(status_code=501, detail="SAM model not available in this build")

    session = _get_session("sam")
    input_img = _read_image(data)

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

    input_img = Image.fromarray(img_array)

    input_points = np.array([[p["x"], p["y"]] for p in pts], dtype=np.float32)
    input_labels = np.array([p["label"] for p in pts], dtype=np.int32)

    try:
        output_img = session.predict_masks(input_img, input_points, input_labels)
    except AttributeError:
        output_img = remove(input_img, session=session)

    return _png_response(output_img)
