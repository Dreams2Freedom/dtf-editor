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

        # Warp masks from INPUT_SIZE space back to original image space
        inv_transform = np.linalg.inv(transform_matrix)
        output_masks = _transform_masks(masks, original_size, inv_transform)

        # Pick highest-IoU mask
        best = int(np.argmax(iou_preds[0]))
        binary_mask = (output_masks[best] > 0.0).astype(np.uint8) * 255
        best_low_res = low_res_masks[:, best : best + 1]
        score = float(iou_preds[0, best])

        return binary_mask, best_low_res, score


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
