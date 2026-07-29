"""
SAM ONNX predictor for interactive masking.

Wraps rembg's sam_vit_b model (sam_vit_b_01ec64.encoder.onnx /
sam_vit_b_01ec64.decoder.onnx) with a clean encode-once / predict-many API
for brush-based interactive segmentation.

The rembg SAM model uses a non-standard interface:
  - Encoder input: (H, W, 3) float32 raw pixels (no ImageNet norm), scaled to
    fit within INPUT_SIZE=(684, 1024) via cv2.warpAffine with a scale matrix.
  - Decoder orig_im_size: INPUT_SIZE (not original image size).
  - Output masks: in INPUT_SIZE space; must be inverse-transformed back.

Latency budget (CPU, ViT-B):
  encode_image: ~3-6s on first call (model load + inference), ~2-3s thereafter
  predict:      ~50-200ms per call

Memory: ~500MB peak during encode, ~50MB during predict.
"""
import logging
import os
from copy import deepcopy
from threading import Lock
from typing import Optional

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

logger = logging.getLogger(__name__)

# rembg's SAM encoder accepts images scaled to fit within this box (h, w).
INPUT_SIZE = (684, 1024)
TARGET_SIZE = 1024  # longest side for apply_coords normalization

# Default model ID used by rembg when new_session('sam') is called.
_SAM_MODEL_NAME = "sam_vit_b_01ec64"


def _preprocess(img: Image.Image):
    """
    Resize image to fit INPUT_SIZE using rembg's warpAffine approach.

    Returns:
      cv_resized: (H, W, 3) float32 in [0, 255] range (no normalization)
      original_size: (orig_h, orig_w)
      transform_matrix: 3x3 scale matrix (maps original → encoder space)
    """
    img_rgb = img.convert("RGB")
    cv_image = np.array(img_rgb)
    original_size = cv_image.shape[:2]  # (h, w)

    scale_x = INPUT_SIZE[1] / cv_image.shape[1]
    scale_y = INPUT_SIZE[0] / cv_image.shape[0]
    scale = min(scale_x, scale_y)

    transform_matrix = np.array(
        [[scale, 0, 0], [0, scale, 0], [0, 0, 1]], dtype=np.float64
    )

    cv_resized = cv2.warpAffine(
        cv_image,
        transform_matrix[:2],
        (INPUT_SIZE[1], INPUT_SIZE[0]),
        flags=cv2.INTER_LINEAR,
    )
    return cv_resized.astype(np.float32), original_size, transform_matrix


def _apply_coords(coords: np.ndarray, original_size, target_length: int) -> np.ndarray:
    """
    Map coords from original_size space toward target_length longest-side space.
    In practice, with original_size=INPUT_SIZE and target_length=TARGET_SIZE=1024
    this is identity (scale=1.0), so the real transform is done by matmul below.
    Kept for parity with rembg's reference implementation.
    """
    old_h, old_w = original_size
    scale = target_length * 1.0 / max(old_h, old_w)
    new_h = int(old_h * scale + 0.5)
    new_w = int(old_w * scale + 0.5)
    coords = deepcopy(coords).astype(float)
    coords[..., 0] = coords[..., 0] * (new_w / old_w)
    coords[..., 1] = coords[..., 1] * (new_h / old_h)
    return coords


def _transform_masks(masks, original_size, inv_transform):
    """Warp decoder output masks (INPUT_SIZE space) back to original_size."""
    orig_h, orig_w = original_size
    output_masks = []
    for mask_id in range(masks.shape[1]):
        m = masks[0, mask_id]
        m_back = cv2.warpAffine(
            m,
            inv_transform[:2],
            (orig_w, orig_h),
            flags=cv2.INTER_LINEAR,
        )
        output_masks.append(m_back)
    return output_masks


class SamPredictor:
    def __init__(self, encoder_path: str, decoder_path: str):
        opts = ort.SessionOptions()
        opts.log_severity_level = 3
        self.encoder = ort.InferenceSession(
            encoder_path, sess_options=opts, providers=["CPUExecutionProvider"]
        )
        self.decoder = ort.InferenceSession(
            decoder_path, sess_options=opts, providers=["CPUExecutionProvider"]
        )
        # Query encoder input name dynamically (rembg's model may differ from std)
        self._encoder_input_name = self.encoder.get_inputs()[0].name
        logger.info(
            "SAM predictor ready. Encoder input=%s", self._encoder_input_name
        )

    def encode_image(self, img: Image.Image) -> dict:
        """Run encoder. Returns a cacheable state dict for use with predict()."""
        cv_resized, original_size, transform_matrix = _preprocess(img)
        image_embedding = self.encoder.run(
            None, {self._encoder_input_name: cv_resized}
        )[0]
        return {
            "embeddings": image_embedding,
            "original_size": original_size,
            "transform_matrix": transform_matrix,
        }

    def predict(
        self,
        state: dict,
        points: list,
        labels: list,
        prev_low_res: Optional[np.ndarray] = None,
    ) -> tuple:
        """
        Run decoder with point prompts (in original image coordinate space).

        points: list of (x, y) in original image pixels
        labels: list of int — 1=keep (positive), 0=remove (negative)
        prev_low_res: (1, 1, 256, 256) float32 from a previous predict() call
                      for chained iterative refinement.

        Returns:
          mask_uint8: (orig_h, orig_w) uint8 — 255=foreground, 0=background
          low_res_logits: (1, 1, 256, 256) float32 — feed back as prev_low_res
          iou_score: float
        """
        if not points:
            raise ValueError("predict() requires at least one point")

        image_embedding = state["embeddings"]
        original_size = state["original_size"]
        transform_matrix = state["transform_matrix"]

        # Build coords in original space, add SAM's required padding point
        input_points = np.array(points, dtype=np.float64)  # (N, 2)
        input_labels = np.array(labels, dtype=np.float64)  # (N,)

        onnx_coord = np.concatenate(
            [input_points, np.array([[0.0, 0.0]])], axis=0
        )[None, :, :]  # (1, N+1, 2)
        onnx_label = np.concatenate(
            [input_labels, np.array([-1])], axis=0
        )[None, :].astype(np.float32)  # (1, N+1)

        # apply_coords: maps INPUT_SIZE → TARGET_SIZE (identity when max=1024)
        onnx_coord = _apply_coords(onnx_coord, INPUT_SIZE, TARGET_SIZE).astype(
            np.float32
        )

        # Apply the same scale transform as the image: original → encoder space
        onnx_coord_3d = np.concatenate(
            [onnx_coord, np.ones((1, onnx_coord.shape[1], 1), dtype=np.float32)],
            axis=2,
        )
        onnx_coord_3d = np.matmul(
            onnx_coord_3d, transform_matrix.T.astype(np.float32)
        )
        onnx_coord = onnx_coord_3d[:, :, :2].astype(np.float32)

        if prev_low_res is not None:
            mask_input = prev_low_res.astype(np.float32)
            has_mask = np.ones(1, dtype=np.float32)
        else:
            mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
            has_mask = np.zeros(1, dtype=np.float32)

        # Decoder uses INPUT_SIZE as orig_im_size (not the actual original size)
        decoder_inputs = {
            "image_embeddings": image_embedding,
            "point_coords": onnx_coord,
            "point_labels": onnx_label,
            "mask_input": mask_input,
            "has_mask_input": has_mask,
            "orig_im_size": np.array(INPUT_SIZE, dtype=np.float32),
        }

        masks, iou_preds, low_res_masks = self.decoder.run(None, decoder_inputs)

        # Pick the highest-IoU mask, then warp ONLY that one back to original
        # space. The decoder returns 3 candidate masks but we only ever keep the
        # best, so warping all 3 (as before) was 3x wasted work per call — a big
        # cost in the automatic grid sweep.
        best = int(np.argmax(iou_preds[0]))
        inv_transform = np.linalg.inv(transform_matrix)
        orig_h, orig_w = original_size
        m_back = cv2.warpAffine(
            masks[0, best],
            inv_transform[:2],
            (orig_w, orig_h),
            flags=cv2.INTER_LINEAR,
        )
        binary_mask = (m_back > 0.0).astype(np.uint8) * 255
        best_low_res = low_res_masks[:, best : best + 1]
        score = float(iou_preds[0, best])

        return binary_mask, best_low_res, score

    def segment_everything(
        self,
        img: Image.Image,
        points_per_side: int = 12,
        pred_iou_thresh: float = 0.80,
        min_area_frac: float = 0.002,
        max_area_frac: float = 0.95,
        nms_iou: float = 0.7,
    ) -> tuple:
        """
        Automatic "find everything" segmentation, built on top of the proven
        single-point predict() path: probe a regular grid of foreground points,
        keep confident + reasonably-sized masks, and de-duplicate overlapping
        masks via IoU non-max-suppression (highest score wins).

        This intentionally reuses predict() rather than re-implementing the ONNX
        decoder call, so the automatic mode inherits the same (working) coord
        transforms and mask warping.

        Returns:
          pieces: list of dicts {mask(bool HxW), score, area, bbox}, sorted by
                  score desc. Each is a distinct object/region SAM found.
          state:  the encode state (contains original_size), reusable by callers.
        """
        state = self.encode_image(img)
        orig_h, orig_w = state["original_size"]
        total_area = float(orig_h * orig_w)

        # Interior grid (skip the exact borders so points land on content).
        xs = np.linspace(0, orig_w, points_per_side + 2)[1:-1]
        ys = np.linspace(0, orig_h, points_per_side + 2)[1:-1]

        records = []
        for y in ys:
            for x in xs:
                try:
                    mask, _low, score = self.predict(
                        state, [(float(x), float(y))], [1]
                    )
                except Exception as e:  # never let one bad point kill the sweep
                    logger.warning("segment_everything point failed: %s", e)
                    continue
                if score < pred_iou_thresh:
                    continue
                binm = mask > 0
                area = int(binm.sum())
                if area < min_area_frac * total_area or area > max_area_frac * total_area:
                    continue
                ys_idx, xs_idx = np.where(binm)
                if ys_idx.size == 0:
                    continue
                bbox = (
                    int(xs_idx.min()),
                    int(ys_idx.min()),
                    int(xs_idx.max()),
                    int(ys_idx.max()),
                )
                records.append(
                    {"mask": binm, "score": float(score), "area": area, "bbox": bbox}
                )

        # NMS by mask IoU: keep the highest-scoring of any heavily-overlapping set.
        records.sort(key=lambda r: r["score"], reverse=True)
        kept = []
        for r in records:
            duplicate = False
            for k in kept:
                inter = int(np.logical_and(r["mask"], k["mask"]).sum())
                if inter == 0:
                    continue
                union = r["area"] + k["area"] - inter
                if union > 0 and inter / union > nms_iou:
                    duplicate = True
                    break
            if not duplicate:
                kept.append(r)

        logger.info(
            "segment_everything: %d grid points -> %d raw -> %d pieces",
            points_per_side * points_per_side,
            len(records),
            len(kept),
        )
        return kept, state


def _detect_bg_color(rgb: np.ndarray) -> np.ndarray:
    """Median colour of the image's 1px border (robust background estimate),
    mirroring the classical engine's detectBorderColor."""
    border = np.concatenate(
        [rgb[0, :, :], rgb[-1, :, :], rgb[:, 0, :], rgb[:, -1, :]], axis=0
    )
    return np.median(border, axis=0)


def compute_background_region(rgb: np.ndarray, tol: int = 50) -> np.ndarray:
    """
    The classical "reachable-from-the-border = background" idea, done properly:
    background = connected regions of background-COLOURED pixels that touch the
    image edge. Enclosed background-coloured pockets (e.g. a white flower inside
    the design) are NOT included, because they don't connect to the outer edge.

    Returns a bool (H, W) mask: True = background.
    """
    bg = _detect_bg_color(rgb).astype(np.int32)
    diff = rgb.astype(np.int32) - bg
    dist2 = (diff * diff).sum(axis=2)
    candidate = (dist2 <= tol * tol).astype(np.uint8)  # background-coloured pixels

    # Connected components of the candidate mask; keep only those touching a border.
    num, labels = cv2.connectedComponents(candidate, connectivity=4)
    border_labels = set(np.unique(labels[0, :]))
    border_labels |= set(np.unique(labels[-1, :]))
    border_labels |= set(np.unique(labels[:, 0]))
    border_labels |= set(np.unique(labels[:, -1]))
    border_labels.discard(0)  # 0 = non-candidate pixels
    if not border_labels:
        return np.zeros(rgb.shape[:2], dtype=bool)
    return np.isin(labels, list(border_labels))


def select_subject_mask(
    pieces: list,
    rgb: np.ndarray,
    tol: int = 30,
    bg_overlap_thresh: float = 0.6,
) -> np.ndarray:
    """
    Our removal-engine decision on top of SAM's clean pieces (SAM highlights,
    our tools remove): keep the SUBJECT, drop the BACKGROUND.

    A SAM piece is BACKGROUND when it mostly overlaps the border-connected
    background-coloured region — i.e. it IS the outer background or a gap. Design
    elements are kept whole (we do NOT carve pixels out of a kept piece), so
    pastel flowers/leaves near the edge survive intact instead of being eroded.
    The gaps between elements go transparent because SAM segments them as their
    own background pieces, which get dropped here.

    `tol` is deliberately tight so pale/pastel design colours are NOT mistaken
    for the (usually white) background.

    Returns a (H, W) uint8 mask: 255=keep, 0=remove.
    """
    h, w = rgb.shape[:2]
    subject = np.zeros((h, w), dtype=bool)
    if not pieces:
        return subject.astype(np.uint8) * 255

    bg_region = compute_background_region(rgb, tol=tol)
    bg_color = _detect_bg_color(rgb).astype(np.float32)
    rgb_f = rgb.astype(np.float32)

    def mean_saturation(m: np.ndarray) -> float:
        """Rough HSV saturation of a piece. Flat background (white/gray) ~0;
        colored design elements (leaves, flowers) are clearly higher."""
        px = rgb_f[m]
        if px.size == 0:
            return 0.0
        mx = px.max(axis=1)
        mn = px.min(axis=1)
        sat = np.where(mx > 1e-3, (mx - mn) / mx, 0.0)
        return float(sat.mean())

    def mean_color_dist(m: np.ndarray) -> float:
        """Distance of a piece's mean colour to the detected background colour."""
        px = rgb_f[m]
        if px.size == 0:
            return 1e9
        return float(np.linalg.norm(px.mean(axis=0) - bg_color))

    # A flat piece is BACKGROUND when it's connected to the outer background OR
    # it's simply background-COLOURED anywhere in the image — this second case is
    # what removes an enclosed background pocket walled off inside a border (e.g.
    # the tan inside a circular logo frame), matching ClippingMagic. Colourful /
    # detailed pieces (text is dark, badges are saturated) are always kept.
    sat_thresh = 0.12
    bg_color_tol = 55  # a flat piece this close to the bg colour counts as background

    any_kept = False
    for p in pieces:
        m = p["mask"]
        if m.shape != (h, w):
            continue
        area = int(m.sum())
        if area == 0:
            continue
        is_flat = mean_saturation(m) < sat_thresh
        overlap = int(np.logical_and(m, bg_region).sum()) / area
        is_bg_colored = mean_color_dist(m) <= bg_color_tol
        if is_flat and (overlap > bg_overlap_thresh or is_bg_colored):
            continue  # flat background piece (outer, gap, OR enclosed) -> remove
        subject |= m
        any_kept = True

    if not any_kept:
        # Nothing qualified — keep the largest non-background-ish piece.
        largest = max(pieces, key=lambda r: r["area"])
        subject |= largest["mask"]

    # Carve out the border-connected background-coloured pixels. At the tight
    # tol this only strips genuinely near-white background/gap pixels (which the
    # loose SAM piece masks pull in around each element), NOT the coloured design
    # itself — so the background goes transparent while flowers/leaves stay.
    subject &= ~bg_region

    # Fill tiny enclosed specks: small transparent holes that are NOT connected
    # to the outer background are near-white design detail (highlights inside a
    # flower, thin light areas) the carve nicked out — fill them back. Large gaps
    # and the border-connected background stay transparent. Mirrors the classical
    # engine's stranded-speck / internal-hole cleanup.
    inv = (~subject).astype(np.uint8)
    num, labels = cv2.connectedComponents(inv, connectivity=4)
    if num > 1:
        sizes = np.bincount(labels.ravel(), minlength=num)
        border_ids = np.unique(
            np.concatenate(
                [labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]]
            )
        )
        is_border = np.zeros(num, dtype=bool)
        is_border[border_ids] = True
        speck_px = max(1, int(0.0006 * h * w))  # ~0.06% of the image
        fill_label = (sizes < speck_px) & (~is_border)
        fill_label[0] = False  # label 0 is the kept subject, never refill it
        subject |= fill_label[labels]

    return subject.astype(np.uint8) * 255


# Distinct, high-contrast colors for the piece-overlay visualization.
_OVERLAY_COLORS = np.array(
    [
        [239, 68, 68], [59, 130, 246], [34, 197, 94], [234, 179, 8],
        [168, 85, 247], [236, 72, 153], [14, 165, 233], [249, 115, 22],
        [132, 204, 22], [217, 70, 239], [20, 184, 166], [244, 63, 94],
    ],
    dtype=np.float32,
)


def render_pieces_overlay(img: Image.Image, pieces: list) -> Image.Image:
    """Blend each SAM piece as a distinct translucent color over the original,
    so a human can SEE how the image was cut into objects."""
    base = np.array(img.convert("RGB"), dtype=np.float32)
    h, w = base.shape[:2]
    out = base.copy()
    alpha = 0.5
    for i, p in enumerate(pieces):
        m = p["mask"]
        if m.shape != (h, w):
            continue
        color = _OVERLAY_COLORS[i % len(_OVERLAY_COLORS)]
        out[m] = (1 - alpha) * out[m] + alpha * color
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def apply_mask(img: Image.Image, mask: np.ndarray) -> Image.Image:
    """
    Apply a (H, W) uint8 mask as alpha to an RGBA image.
    mask values: 255=opaque (keep), 0=transparent (remove).
    """
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = rgba.shape[:2]
    if mask.shape != (h, w):
        mask_pil = Image.fromarray(mask).resize((w, h), Image.NEAREST)
        mask = np.array(mask_pil, dtype=np.uint8)
    rgba[:, :, 3] = mask
    return Image.fromarray(rgba, "RGBA")


_predictor: Optional[SamPredictor] = None
_lock = Lock()


def get_predictor() -> SamPredictor:
    """Lazily load the singleton SAM predictor."""
    global _predictor
    if _predictor is not None:
        return _predictor
    with _lock:
        if _predictor is not None:
            return _predictor

        # Trigger rembg model download (no-op if already cached in Docker image)
        from rembg import new_session

        try:
            new_session("sam")
        except Exception as e:
            logger.warning("rembg new_session('sam') non-fatal: %s", e)

        u2net_home = os.environ.get("U2NET_HOME", os.path.expanduser("~/.u2net"))
        encoder_path = os.path.join(u2net_home, f"{_SAM_MODEL_NAME}.encoder.onnx")
        decoder_path = os.path.join(u2net_home, f"{_SAM_MODEL_NAME}.decoder.onnx")

        if not os.path.exists(encoder_path):
            raise RuntimeError(
                f"SAM encoder not found at {encoder_path}. "
                "Files in U2NET_HOME: "
                + str(os.listdir(u2net_home) if os.path.isdir(u2net_home) else "dir missing")
            )
        if not os.path.exists(decoder_path):
            raise RuntimeError(
                f"SAM decoder not found at {decoder_path}. "
                "Files in U2NET_HOME: "
                + str(os.listdir(u2net_home) if os.path.isdir(u2net_home) else "dir missing")
            )

        _predictor = SamPredictor(encoder_path, decoder_path)
        return _predictor
