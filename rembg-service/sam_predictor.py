"""
SAM ONNX predictor for interactive masking.

Wraps the SAM ViT-B ONNX models (downloaded by rembg into U2NET_HOME) with a
clean encode-once / predict-many API for brush-based interactive segmentation.

Latency budget (CPU, ViT-B quantized):
  encode_image: ~3-6s on first call (model load + inference), ~2-3s thereafter
  predict:      ~50-150ms per call

Memory: ~500MB peak during encode, ~50MB during predict.
"""
import logging
import os
from threading import Lock
from typing import Optional

import numpy as np
import onnxruntime as ort
from PIL import Image

logger = logging.getLogger(__name__)

# SAM preprocessing constants (ImageNet normalization)
PIXEL_MEAN = np.array([123.675, 116.28, 103.53], dtype=np.float32)
PIXEL_STD = np.array([58.395, 57.12, 57.375], dtype=np.float32)
TARGET_LENGTH = 1024


def _preprocess(img: Image.Image) -> tuple[np.ndarray, tuple[int, int], tuple[int, int]]:
    """
    Returns:
      preprocessed: (1, 3, 1024, 1024) float32 NCHW, padded
      orig_size: (h, w)
      resized_size: (new_h, new_w) before padding
    """
    img_rgb = img.convert("RGB")
    orig_w, orig_h = img_rgb.size

    scale = TARGET_LENGTH / max(orig_h, orig_w)
    new_h = int(round(orig_h * scale))
    new_w = int(round(orig_w * scale))

    resized = img_rgb.resize((new_w, new_h), Image.BILINEAR)
    arr = np.array(resized, dtype=np.float32)

    arr = (arr - PIXEL_MEAN) / PIXEL_STD

    padded = np.zeros((TARGET_LENGTH, TARGET_LENGTH, 3), dtype=np.float32)
    padded[:new_h, :new_w] = arr

    nchw = padded.transpose(2, 0, 1)[None]  # (1, 3, 1024, 1024)
    return nchw, (orig_h, orig_w), (new_h, new_w)


def _scale_points(
    points: list[tuple[float, float]],
    orig_size: tuple[int, int],
    resized_size: tuple[int, int],
) -> np.ndarray:
    """Map points from original image space to resized (pre-padding) space."""
    orig_h, orig_w = orig_size
    new_h, new_w = resized_size
    sx = new_w / orig_w
    sy = new_h / orig_h
    return np.array([[p[0] * sx, p[1] * sy] for p in points], dtype=np.float32)


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
        logger.info("SAM predictor ready (encoder=%s, decoder=%s)", encoder_path, decoder_path)

    def encode_image(self, img: Image.Image) -> dict:
        """Run encoder. Returns a cacheable state dict for use with predict()."""
        preprocessed, orig_size, resized_size = _preprocess(img)
        embeddings = self.encoder.run(None, {"images": preprocessed})[0]
        return {
            "embeddings": embeddings,
            "orig_size": orig_size,
            "resized_size": resized_size,
        }

    def predict(
        self,
        state: dict,
        points: list[tuple[float, float]],
        labels: list[int],
        prev_low_res: Optional[np.ndarray] = None,
    ) -> tuple[np.ndarray, np.ndarray, float]:
        """
        Run decoder with point prompts.

        labels: 1 = positive (keep), 0 = negative (remove)
        prev_low_res: (1, 1, 256, 256) low-res mask from a previous predict() call
                      for chained refinement (each click feeds prev mask back in)

        Returns: (mask_uint8 (H, W) where H,W match orig image,
                  low_res_logits (1, 1, 256, 256) for next call,
                  iou_score float)
        """
        if not points:
            raise ValueError("predict() requires at least one point")
        if len(points) != len(labels):
            raise ValueError("points and labels must have the same length")

        embeddings = state["embeddings"]
        orig_size = state["orig_size"]
        resized_size = state["resized_size"]

        coords = _scale_points(points, orig_size, resized_size)
        labels_arr = np.array(labels, dtype=np.float32)

        # SAM ONNX export expects a trailing padding point with label -1
        coords = np.concatenate([coords, np.array([[0.0, 0.0]], dtype=np.float32)], axis=0)
        labels_arr = np.concatenate([labels_arr, np.array([-1.0], dtype=np.float32)], axis=0)

        coords = coords[None]  # (1, N+1, 2)
        labels_arr = labels_arr[None]  # (1, N+1)

        if prev_low_res is not None:
            mask_input = prev_low_res.astype(np.float32)
            has_mask = np.array([1.0], dtype=np.float32)
        else:
            mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
            has_mask = np.array([0.0], dtype=np.float32)

        orig_im_size = np.array(
            [float(orig_size[0]), float(orig_size[1])], dtype=np.float32
        )

        masks, iou_preds, low_res_masks = self.decoder.run(
            None,
            {
                "image_embeddings": embeddings,
                "point_coords": coords,
                "point_labels": labels_arr,
                "mask_input": mask_input,
                "has_mask_input": has_mask,
                "orig_im_size": orig_im_size,
            },
        )

        # Pick the highest-IoU mask among the multi-mask output
        best = int(np.argmax(iou_preds[0]))
        binary_mask = (masks[0, best] > 0).astype(np.uint8) * 255
        best_low_res = low_res_masks[:, best : best + 1]
        score = float(iou_preds[0, best])
        return binary_mask, best_low_res, score


def apply_mask(img: Image.Image, mask: np.ndarray) -> Image.Image:
    """
    Apply a (H, W) uint8 mask as alpha to an RGBA image.
    The mask should be 0 (transparent) or 255 (opaque).
    """
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w = rgba.shape[:2]
    if mask.shape != (h, w):
        # Resize mask to match (e.g., orig_im_size rounding mismatch)
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

        # Trigger rembg's model download mechanism (no-op if already cached)
        from rembg import new_session
        try:
            new_session("sam")
        except Exception as e:
            logger.warning("rembg new_session('sam') hit a non-fatal issue: %s", e)

        u2net_home = os.environ.get("U2NET_HOME", os.path.expanduser("~/.u2net"))
        encoder_path = os.path.join(u2net_home, "vit_b-encoder-quant.onnx")
        decoder_path = os.path.join(u2net_home, "vit_b-decoder-quant.onnx")

        if not os.path.exists(encoder_path) or not os.path.exists(decoder_path):
            raise RuntimeError(
                f"SAM ONNX files missing in {u2net_home}. "
                "Ensure the Docker build pre-downloaded them via "
                "`new_session('sam')`."
            )

        _predictor = SamPredictor(encoder_path, decoder_path)
        return _predictor
