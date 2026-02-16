import Replicate from 'replicate';
import sharp from 'sharp';
import { env } from '@/config/env';

interface RemoveBackgroundResult {
  /** URL to the output image (transparent PNG) */
  outputUrl: string;
  /** Original image dimensions */
  imageSize: { width: number; height: number };
}

export class SAM2Service {
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: env.REPLICATE_API_TOKEN,
      useFileOutput: false,
    });
  }

  /**
   * Remove background using BiRefNet on Replicate.
   * Returns a transparent PNG URL.
   */
  async removeBackground(
    imageBuffer: Buffer
  ): Promise<RemoveBackgroundResult> {
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 1024;
    const originalHeight = metadata.height || 1024;

    // Convert to base64 data URI for Replicate
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();
    const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // Use BiRefNet for high-quality background removal (~1 second, 4.5M runs)
    // Version hash required for community models on Replicate
    const output = await this.replicate.run(
      'men1scus/birefnet:f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7' as `${string}/${string}:${string}`,
      {
        input: {
          image: base64Image,
        },
      }
    );

    // BiRefNet returns a single URL string to the output image
    const outputUrl = typeof output === 'string' ? output : '';

    if (!outputUrl) {
      throw new Error('No output returned from background removal model');
    }

    return {
      outputUrl,
      imageSize: { width: originalWidth, height: originalHeight },
    };
  }

  /**
   * Download an image from URL and return as buffer.
   */
  async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  isAvailable(): boolean {
    return !!env.REPLICATE_API_TOKEN;
  }
}
