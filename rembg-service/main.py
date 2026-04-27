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

app = FastAPI(title="rembg-service", version="1.1.0")

API_KEY = os.environ.get("REMBG_SERVICE_API_KEY", "")

_sessions: dict = {}
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


def _parse_color(s: str) -> tuple[int, int, int]:
    """Parse 'r,g,b' or '#rrggbb' or '#rgb' into a tuple. Raises on invalid."""
    s = s.strip()
    if s.startswith("#"):
        h = s[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        if len(h) != 6:
            raise ValueError(f"Invalid hex color: {s}")
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    parts = [p.strip() for p in s.split(",")]
    if len(parts) != 3:
        raise ValueError(f"Color must be 'r,g,b' or '#rrggbb': {s}")
    rgb = tuple(int(p) for p in parts)
    for c in rgb:
        if not 0 <= c <= 255:
            raise ValueError(f"Color components must be 0-255: {s}")
    return rgb  # type: ignore[return-value]


def _flood_fill_color_removal(
    img: Image.Image,
    target_rgb: tuple[int, int, int],
    tolerance: int = 30,
    seed_points: Optional[list[tuple[int, int]]] = None,
) -> Image.Image:
    """
    BFS flood-fill removing pixels matching target_rgb within tolerance.

    If seed_points is None: seeds from every edge pixel that matches.
    Otherwise: seeds from those points (click-to-remove).

    tolerance is squared-Euclidean RGB distance threshold (max ~441 for
    pure white vs pure black). Already-transparent pixels (a < 10) are
    always considered removable so they participate in connectivity.
    """
    rgba = np.array(img, dtype=np.uint8)
    h, w = rgba.shape[:2]

    r = rgba[:, :, 0].astype(np.int32)
    g = rgba[:, :, 1].astype(np.int32)
    b = rgba[:, :, 2].astype(np.int32)
    a = rgba[:, :, 3]

    tr, tg, tb = target_rgb
    dist_sq = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2
    tol_sq = tolerance * tolerance

    removable = (dist_sq <= tol_sq) | (a < 10)

    visited = np.zeros((h, w), dtype=bool)
    queue: deque = deque()

    if seed_points is None:
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
    else:
        for sx, sy in seed_points:
            if 0 <= sx < w and 0 <= sy < h and removable[sy, sx] and not visited[sy, sx]:
                visited[sy, sx] = True
                queue.append((sy, sx))

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and removable[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    result = rgba.copy()
    result[visited, 3] = 0
    return Image.fromarray(result, "RGBA")


def _flood_fill_white_removal(img: Image.Image, threshold: int = 240) -> Image.Image:
    """Backwards-compatible shim. threshold is the lower-bound RGB for 'near white'."""
    tolerance = max(0, 255 - threshold)
    return _flood_fill_color_removal(img, target_rgb=(255, 255, 255), tolerance=int(tolerance * 1.7))


def _detect_background(img: Image.Image) -> dict:
    """
    Sample border pixels and classify the background.

    Returns dict with: dominant [r,g,b], secondary [r,g,b]|None,
    intra_variance float, centroid_distance float,
    confidence 'uniform'|'two-color'|'gradient'|'complex'|'transparent',
    recommended_mode 'color-fill'|'two-color-fill'|'ml+color'|'ml-only'|'noop'.
    """
    rgba = np.array(img, dtype=np.uint8)
    h, w = rgba.shape[:2]

    # Already-transparent? short-circuit.
    if (rgba[:, :, 3] < 10).mean() > 0.5:
        return {
            "dominant": [0, 0, 0],
            "secondary": None,
            "intra_variance": 0.0,
            "centroid_distance": 0.0,
            "confidence": "transparent",
            "recommended_mode": "noop",
        }

    # 2-pixel border ring
    ring = []
    if h >= 4 and w >= 4:
        ring.append(rgba[:2, :, :3].reshape(-1, 3))
        ring.append(rgba[-2:, :, :3].reshape(-1, 3))
        ring.append(rgba[2:-2, :2, :3].reshape(-1, 3))
        ring.append(rgba[2:-2, -2:, :3].reshape(-1, 3))
    else:
        ring.append(rgba[:, :, :3].reshape(-1, 3))
    pixels = np.concatenate(ring, axis=0).astype(np.float32)

    # Stratified random sample to ~4000 pixels for k-means speed
    if pixels.shape[0] > 4000:
        idx = np.random.choice(pixels.shape[0], 4000, replace=False)
        pixels = pixels[idx]

    # k-means k=2, simple Lloyd's, ~10 iterations
    rng = np.random.default_rng(42)
    init_idx = rng.choice(pixels.shape[0], 2, replace=False)
    centroids = pixels[init_idx].copy()

    for _ in range(10):
        d0 = np.sum((pixels - centroids[0]) ** 2, axis=1)
        d1 = np.sum((pixels - centroids[1]) ** 2, axis=1)
        labels = (d1 < d0).astype(np.int32)
        new_centroids = centroids.copy()
        for k in (0, 1):
            mask = labels == k
            if mask.any():
                new_centroids[k] = pixels[mask].mean(axis=0)
        if np.allclose(new_centroids, centroids, atol=0.5):
            centroids = new_centroids
            break
        centroids = new_centroids

    # Sort so dominant cluster (more pixels) is first
    counts = np.array([(labels == 0).sum(), (labels == 1).sum()])
    order = np.argsort(-counts)
    centroids = centroids[order]
    counts = counts[order]

    # Per-pixel distance to nearest centroid → intra-cluster RMS
    d0 = np.sqrt(np.sum((pixels - centroids[0]) ** 2, axis=1))
    d1 = np.sqrt(np.sum((pixels - centroids[1]) ** 2, axis=1))
    nearest = np.minimum(d0, d1)
    intra_variance = float(np.sqrt((nearest ** 2).mean()))
    centroid_distance = float(np.sqrt(np.sum((centroids[0] - centroids[1]) ** 2)))

    dominant = [int(round(c)) for c in centroids[0]]
    secondary = [int(round(c)) for c in centroids[1]]

    # Decide
    if intra_variance < 8 and centroid_distance < 25:
        confidence = "uniform"
        recommended_mode = "color-fill"
        secondary_out = None
    elif intra_variance < 8 and centroid_distance >= 25:
        # Two distinct edge colors, both tight clusters
        confidence = "two-color"
        recommended_mode = "two-color-fill"
        secondary_out = secondary
    elif intra_variance < 25:
        confidence = "gradient"
        recommended_mode = "ml+color"
        secondary_out = None
    else:
        confidence = "complex"
        recommended_mode = "ml-only"
        secondary_out = None

    return {
        "dominant": dominant,
        "secondary": secondary_out,
        "intra_variance": intra_variance,
        "centroid_distance": centroid_distance,
        "confidence": confidence,
        "recommended_mode": recommended_mode,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/detect-bg")
async def detect_bg(
    image: UploadFile = File(...),
    x_api_key: Optional[str] = Header(default=None),
):
    """Sample border pixels and return background classification."""
    _require_auth(x_api_key)

    data = await image.read()
    if len(data) > 52_428_800:
        raise HTTPException(status_code=413, detail="Image too large (max 50MB)")

    input_img = _read_image(data)
    return _detect_background(input_img)


@app.post("/remove")
async def remove_background(
    image: UploadFile = File(...),
    model: str = Form(default="birefnet-general-lite"),
    mode: str = Form(default="ml+color"),
    target_color: Optional[str] = Form(default=None),
    tolerance: int = Form(default=30),
    seed_points: Optional[str] = Form(default=None),
    # Legacy compatibility:
    post_process_white: bool = Form(default=True),
    white_threshold: int = Form(default=240),
    x_api_key: Optional[str] = Header(default=None),
):
    """
    Background removal with multiple strategies.

    mode:
      - 'color-fill'      → flood-fill from edges with target_color + tolerance, no ML
      - 'click-fill'      → flood-fill from seed_points, no ML
      - 'ml-only'         → ML mask only, no flood-fill
      - 'ml+color'        → ML mask, then flood-fill cleanup with target_color (or white)
      - legacy 'white-fill' (via model param) still works
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
        "white-fill",
    }
    if model not in allowed_models:
        raise HTTPException(status_code=400, detail=f"Unknown model. Choose from: {allowed_models}")

    if not (0 <= tolerance <= 200):
        raise HTTPException(status_code=400, detail="tolerance must be 0-200")
    if not (0 <= white_threshold <= 255):
        raise HTTPException(status_code=400, detail="white_threshold must be 0-255")

    data = await image.read()
    if len(data) > 52_428_800:
        raise HTTPException(status_code=413, detail="Image too large (max 50MB)")

    input_img = _read_image(data)

    # Parse target color (default white if not given)
    if target_color:
        try:
            target_rgb = _parse_color(target_color)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        target_rgb = (255, 255, 255)

    # Parse seed points
    seeds = None
    if seed_points:
        try:
            raw = json.loads(seed_points)
            seeds = [(int(p[0]), int(p[1])) for p in raw]
        except Exception:
            raise HTTPException(status_code=400, detail="seed_points must be JSON array of [x, y]")

    # Legacy paths
    if model == "white-fill":
        # Legacy: pure white flood-fill (ignores mode)
        output_img = _flood_fill_white_removal(input_img, threshold=white_threshold)
        return _png_response(output_img)

    # New mode-driven dispatch
    if mode == "color-fill":
        output_img = _flood_fill_color_removal(input_img, target_rgb, tolerance)

    elif mode == "click-fill":
        if not seeds:
            raise HTTPException(status_code=400, detail="click-fill requires seed_points")
        # For click-fill, sample target color from the first seed pixel if not given
        if not target_color:
            sx, sy = seeds[0]
            arr = np.array(input_img)
            if 0 <= sx < arr.shape[1] and 0 <= sy < arr.shape[0]:
                px = arr[sy, sx]
                target_rgb = (int(px[0]), int(px[1]), int(px[2]))
        output_img = _flood_fill_color_removal(input_img, target_rgb, tolerance, seed_points=seeds)

    elif mode == "ml-only":
        session = _get_session(model)
        output_img = remove(input_img, session=session)

    elif mode == "ml+color":
        session = _get_session(model)
        output_img = remove(input_img, session=session)
        # If no explicit target_color was provided, fall back to the legacy
        # white-fill behavior to preserve backwards-compatibility.
        if target_color:
            output_img = _flood_fill_color_removal(output_img, target_rgb, tolerance)
        elif post_process_white:
            output_img = _flood_fill_white_removal(output_img, threshold=white_threshold)

    else:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")

    return _png_response(output_img)


@app.post("/embed")
async def embed_image(
    image: UploadFile = File(...),
    x_api_key: Optional[str] = Header(default=None),
):
    """SAM embedding endpoint (kept for forward compat; not yet UI-wired)."""
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
