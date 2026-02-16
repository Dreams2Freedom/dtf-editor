import Replicate from 'replicate';
import sharp from 'sharp';
import { env } from '@/config/env';

interface SegmentResult {
  /** URL to the combined mask image */
  combinedMaskUrl: string;
  /** URLs to individual mask images */
  individualMaskUrls: string[];
  /** Original image dimensions */
  imageSize: { width: number; height: number };
}

interface PointPrompt {
  x: number;
  y: number;
  label: 0 | 1;
}

export class SAM2Service {
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * Run SAM2 segmentation on Replicate with optional point prompts.
   * Returns mask image URLs.
   */
  async segment(
    imageBuffer: Buffer,
    points?: PointPrompt[]
  ): Promise<SegmentResult> {
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 1024;
    const originalHeight = metadata.height || 1024;

    // Convert to base64 data URI for Replicate
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();
    const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // Build input for Replicate meta/sam-2
    const input: Record<string, unknown> = {
      image: base64Image,
      multimask_output: false,
    };

    // Add point prompts if provided
    if (points && points.length > 0) {
      // Format: "x1,y1;x2,y2" for point_coords
      // Convert from normalized (0-1) to pixel coordinates
      const coordStrings = points.map(
        p =>
          `${Math.round(p.x * originalWidth)},${Math.round(p.y * originalHeight)}`
      );
      input.point_coords = coordStrings.join(';');

      // Format: "1;0;1" for point_labels
      input.point_labels = points.map(p => p.label).join(';');
    }

    const output = (await this.replicate.run(
      'meta/sam-2' as `${string}/${string}`,
      {
        input,
      }
    )) as {
      combined_mask?: string;
      individual_masks?: string[];
    };

    const combinedMaskUrl = output.combined_mask || '';
    const individualMaskUrls = output.individual_masks || [];

    return {
      combinedMaskUrl,
      individualMaskUrls,
      imageSize: { width: originalWidth, height: originalHeight },
    };
  }

  /**
   * Download a mask from URL and return as a sharp-compatible buffer.
   * The mask is a black/white image where white = foreground.
   */
  async downloadMask(maskUrl: string): Promise<Buffer> {
    const response = await fetch(maskUrl);
    if (!response.ok) {
      throw new Error(`Failed to download mask: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  isAvailable(): boolean {
    return !!env.REPLICATE_API_TOKEN;
  }
}
