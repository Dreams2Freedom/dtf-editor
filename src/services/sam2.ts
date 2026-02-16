import Replicate from 'replicate';
import sharp from 'sharp';
import { env } from '@/config/env';

/** SAM2 input size expected by the encoder */
const SAM2_INPUT_SIZE = 1024;

interface EncodeResult {
  /** Base64-encoded Float32Array embeddings */
  embeddings: string;
  /** Tensor shape */
  shape: number[];
  /** Original image dimensions */
  imageSize: { width: number; height: number };
}

export class SAM2Service {
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * Encode an image using SAM2 on Replicate.
   * Resizes to 1024x1024, sends to Replicate, returns embeddings.
   */
  async encodeImage(imageBuffer: Buffer): Promise<EncodeResult> {
    // Get original dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || SAM2_INPUT_SIZE;
    const originalHeight = metadata.height || SAM2_INPUT_SIZE;

    // Resize to SAM2 input size (1024x1024), maintaining aspect ratio with padding
    const resized = await sharp(imageBuffer)
      .resize(SAM2_INPUT_SIZE, SAM2_INPUT_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // Convert to base64 data URI for Replicate
    const base64Image = `data:image/png;base64,${resized.toString('base64')}`;

    // Call Replicate SAM2 encoder
    // Using the SAM2 model that returns embeddings for client-side decoding
    const output = (await this.replicate.run(
      env.SAM2_MODEL_VERSION as `${string}/${string}`,
      {
        input: {
          image: base64Image,
          // Return embeddings mode - the model returns the image embedding tensor
          // rather than running full segmentation
          return_embeddings: true,
        },
      }
    )) as { embeddings: string; shape: number[] } | string;

    // Handle different output formats from Replicate models
    if (typeof output === 'string') {
      // Some models return a URL to the embeddings file
      const response = await fetch(output);
      const arrayBuffer = await response.arrayBuffer();
      const float32 = new Float32Array(arrayBuffer);
      return {
        embeddings: Buffer.from(float32.buffer).toString('base64'),
        shape: [1, 256, 64, 64],
        imageSize: { width: originalWidth, height: originalHeight },
      };
    }

    // Direct embeddings response
    return {
      embeddings:
        typeof output.embeddings === 'string'
          ? output.embeddings
          : Buffer.from(
              new Float32Array(output.embeddings as unknown as ArrayBuffer)
                .buffer
            ).toString('base64'),
      shape: output.shape || [1, 256, 64, 64],
      imageSize: { width: originalWidth, height: originalHeight },
    };
  }

  /**
   * Run full auto-segmentation on Replicate (no interactive editing).
   * Returns a PNG buffer with transparent background.
   */
  async autoSegment(imageBuffer: Buffer): Promise<Buffer> {
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    const output = (await this.replicate.run(
      env.SAM2_MODEL_VERSION as `${string}/${string}`,
      {
        input: {
          image: base64Image,
          // Auto-detect the main subject
          multimask_output: false,
        },
      }
    )) as string | string[];

    // Download the result mask/image
    const maskUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(maskUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  }

  isAvailable(): boolean {
    return !!env.REPLICATE_API_TOKEN;
  }
}
