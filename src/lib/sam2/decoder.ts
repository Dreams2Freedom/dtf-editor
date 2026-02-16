'use client';

import type { SAM2Embeddings, PointPrompt, SAM2MaskOutput } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrtModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrtSession = any;

// Dynamic import for onnxruntime-web to avoid SSR issues
let ort: OrtModule = null;

async function getOrt(): Promise<OrtModule> {
  if (!ort) {
    ort = await import('onnxruntime-web');
    // Configure ONNX Runtime
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
  }
  return ort;
}

/**
 * SAM2 Decoder - runs in the browser via ONNX Runtime Web.
 * Loads a ~15MB ONNX decoder model and produces segmentation masks
 * from encoder embeddings + point prompts in ~50ms (WebGPU) or ~200ms (WASM).
 */
export class SAM2Decoder {
  private session: OrtSession = null;
  private modelUrl: string;
  private _isReady = false;

  constructor(modelUrl?: string) {
    this.modelUrl =
      modelUrl ||
      process.env.NEXT_PUBLIC_SAM2_DECODER_URL ||
      '/models/sam2_decoder.onnx';
  }

  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Load the ONNX decoder model. Call once before predict().
   */
  async initialize(): Promise<void> {
    if (this._isReady) return;

    const ortModule = await getOrt();

    // Try WebGPU first, fall back to WASM
    const providers: string[] = [];
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      providers.push('webgpu');
    }
    providers.push('wasm');

    this.session = await ortModule.InferenceSession.create(this.modelUrl, {
      executionProviders: providers,
    });

    this._isReady = true;
  }

  /**
   * Run decoder inference with point prompts.
   * Returns a binary mask as ImageData.
   */
  async predict(
    embeddings: SAM2Embeddings,
    points: PointPrompt[],
    canvasWidth: number,
    canvasHeight: number
  ): Promise<SAM2MaskOutput> {
    if (!this.session) {
      throw new Error('Decoder not initialized. Call initialize() first.');
    }

    const ortModule = await getOrt();

    // Decode base64 embeddings to Float32Array
    const embeddingBytes = Uint8Array.from(atob(embeddings.data), c =>
      c.charCodeAt(0)
    );
    const embeddingFloat32 = new Float32Array(embeddingBytes.buffer);

    // Build input tensors
    const embeddingTensor = new ortModule.Tensor(
      'float32',
      embeddingFloat32,
      embeddings.shape
    );

    // Point coordinates: [N, 2] in pixel space (1024x1024)
    const numPoints = points.length || 1;
    const pointCoords = new Float32Array(numPoints * 2);
    const pointLabels = new Float32Array(numPoints);

    if (points.length === 0) {
      // Default: center point as foreground
      pointCoords[0] = 512;
      pointCoords[1] = 512;
      pointLabels[0] = 1;
    } else {
      for (let i = 0; i < points.length; i++) {
        // Convert normalized [0-1] to 1024x1024 pixel space
        pointCoords[i * 2] = points[i].x * 1024;
        pointCoords[i * 2 + 1] = points[i].y * 1024;
        pointLabels[i] = points[i].label;
      }
    }

    const coordsTensor = new ortModule.Tensor('float32', pointCoords, [
      1,
      numPoints,
      2,
    ]);
    const labelsTensor = new ortModule.Tensor('float32', pointLabels, [
      1,
      numPoints,
    ]);

    // No previous mask input
    const hasMaskInput = new ortModule.Tensor(
      'float32',
      new Float32Array([0]),
      [1]
    );
    const maskInput = new ortModule.Tensor(
      'float32',
      new Float32Array(256 * 256),
      [1, 1, 256, 256]
    );

    // Original image size
    const origImSize = new ortModule.Tensor(
      'float32',
      new Float32Array([1024, 1024]),
      [2]
    );

    // Run inference
    const feeds = {
      image_embeddings: embeddingTensor,
      point_coords: coordsTensor,
      point_labels: labelsTensor,
      mask_input: maskInput,
      has_mask_input: hasMaskInput,
      orig_im_size: origImSize,
    };

    const results = await this.session.run(feeds);

    // Get output mask - usually named 'masks' or 'low_res_masks'
    const outputKey = Object.keys(results).find(
      (k: string) => k.includes('mask') || k.includes('score')
    );
    const maskData = results[outputKey || Object.keys(results)[0]];

    // If there's a scores output, get it
    const scoreKey = Object.keys(results).find((k: string) =>
      k.includes('score')
    );
    const score = scoreKey ? (results[scoreKey].data as Float32Array)[0] : 0.9;

    // Convert to ImageData at canvas size
    const mask = this.tensorToImageData(
      maskData.data as Float32Array,
      maskData.dims as number[],
      canvasWidth,
      canvasHeight
    );

    return {
      mask,
      score,
      width: canvasWidth,
      height: canvasHeight,
    };
  }

  /**
   * Auto-segment with a center point prompt.
   */
  async autoSegment(
    embeddings: SAM2Embeddings,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<SAM2MaskOutput> {
    return this.predict(embeddings, [], canvasWidth, canvasHeight);
  }

  /**
   * Convert a raw mask tensor to ImageData for canvas rendering.
   * The mask tensor values are logits (>0 = foreground).
   */
  private tensorToImageData(
    data: Float32Array,
    dims: number[],
    targetWidth: number,
    targetHeight: number
  ): ImageData {
    // Mask is typically [1, 1, H, W] or [1, H, W]
    const maskH = dims[dims.length - 2] || 256;
    const maskW = dims[dims.length - 1] || 256;

    // Create output ImageData at target size
    const imageData = new ImageData(targetWidth, targetHeight);
    const pixels = imageData.data;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Map target coordinates back to mask coordinates
        const srcX = Math.floor((x / targetWidth) * maskW);
        const srcY = Math.floor((y / targetHeight) * maskH);
        const srcIdx = srcY * maskW + srcX;

        // Mask values are logits: >0 means foreground
        const logit = data[srcIdx] || 0;
        const alpha = logit > 0 ? 255 : 0;

        const dstIdx = (y * targetWidth + x) * 4;
        pixels[dstIdx] = 255; // R
        pixels[dstIdx + 1] = 255; // G
        pixels[dstIdx + 2] = 255; // B
        pixels[dstIdx + 3] = alpha; // A (255=foreground, 0=background)
      }
    }

    return imageData;
  }

  /**
   * Free GPU/WASM resources.
   */
  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
      this._isReady = false;
    }
  }
}
