import { env } from '@/config/env';

export interface VectorizerOptions {
  format?: 'svg' | 'pdf' | 'png' | 'eps' | 'dxf';
  mode?: 'test' | 'test_preview' | 'preview' | 'production';
  // Processing options (as per official API)
  max_colors?: number; // 0-256
  min_area_px?: number; // 0.0-100.0
  // Output styling
  draw_style?: 'fill_shapes' | 'stroke_shapes' | 'stroke_edges';
  shape_stacking?: 'cutouts' | 'stacked';
  group_by?: 'none' | 'color' | 'parent' | 'layer';
  // Gap filler for print quality
  gap_filler_enabled?: boolean;
  gap_filler_stroke_width?: number; // 0.0-5.0
  // Output sizing
  output_dpi?: number;
  scale?: number;
}

export interface VectorizerResult {
  status: 'success' | 'error';
  url?: string;
  error?: string;
  metadata?: {
    originalSize: number;
    processedSize: number;
    processingTime: number;
    format: string;
  };
}

export class VectorizerService {
  private apiId: string;
  private apiSecret: string;
  private baseUrl = 'https://vectorizer.ai/api/v1';

  constructor() {
    this.apiId = env.VECTORIZER_API_KEY;
    this.apiSecret = env.VECTORIZER_API_SECRET;
  }

  /**
   * Convert raster image to vector using Vectorizer.ai API
   */
  async vectorizeImage(
    imageUrl: string,
    options: VectorizerOptions = {}
  ): Promise<VectorizerResult> {
    if (!this.apiId || !this.apiSecret) {
      return {
        status: 'error',
        error: 'Vectorizer.ai API credentials are not configured',
      };
    }

    const startTime = Date.now();

    try {
      // Validate inputs
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      // Download the image first
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.statusText}`
        );
      }

      const imageBlob = await imageResponse.blob();
      const originalSize = imageBlob.size;

      // Prepare form data for Vectorizer.ai API
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');

      // Add options - for PNG, we request SVG and convert later
      const requestFormat = options.format === 'png' ? 'svg' : options.format;
      if (requestFormat) {
        formData.append('output.file_format', requestFormat);
      }

      // Mode (CRITICAL: use 'production' for paid users)
      formData.append('mode', options.mode || 'production');

      // Processing options (as per official Vectorizer.ai API)
      if (options.max_colors !== undefined) {
        formData.append('processing.max_colors', options.max_colors.toString());
      } else {
        // Default to 256 for full color range
        formData.append('processing.max_colors', '256');
      }

      if (options.min_area_px !== undefined) {
        formData.append(
          'processing.shapes.min_area_px',
          options.min_area_px.toString()
        );
      }

      // Output styling (CRITICAL for proper PDF rendering)
      formData.append('output.draw_style', options.draw_style || 'fill_shapes');
      formData.append(
        'output.shape_stacking',
        options.shape_stacking || 'stacked'
      );
      formData.append('output.group_by', options.group_by || 'color');

      // Gap filler for print quality (prevents white lines in PDF)
      if (options.gap_filler_enabled !== false) {
        formData.append('output.gap_filler.enabled', 'true');
        formData.append(
          'output.gap_filler.stroke_width',
          (options.gap_filler_stroke_width || 0.5).toString()
        );
      }

      // Output DPI for high quality
      if (options.output_dpi) {
        formData.append(
          'output.size.output_dpi',
          options.output_dpi.toString()
        );
      } else if (requestFormat === 'pdf') {
        // Default to 300 DPI for PDF (print quality)
        formData.append('output.size.output_dpi', '300');
      }

      // Make request to Vectorizer.ai API
      const response = await fetch(`${this.baseUrl}/vectorize`, {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${this.apiId}:${this.apiSecret}`).toString('base64'),
        },
        body: formData,
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Vectorizer.ai API error: ${response.status} - ${errorData}`
        );
      }

      // For Vectorizer.ai, the response is the processed vector file directly
      const resultBuffer = await response.arrayBuffer();

      // If PNG was requested, convert SVG to PNG
      if (options.format === 'png') {
        try {
          // Import sharp dynamically to avoid client-side issues
          const sharp = (await import('sharp')).default;

          // Convert SVG to PNG with 4x scaling and transparency
          const svgBuffer = Buffer.from(resultBuffer);

          // First, we need to get the dimensions from the SVG
          // Sharp will handle the 4x scaling automatically based on density
          const pngBuffer = await sharp(svgBuffer, { density: 288 }) // 72 * 4 = 288 DPI for 4x scaling
            .png({
              compressionLevel: 9,
              quality: 100,
              force: true,
            })
            .toBuffer();

          const pngBase64 = pngBuffer.toString('base64');
          const pngUrl = `data:image/png;base64,${pngBase64}`;

          return {
            status: 'success',
            url: pngUrl,
            metadata: {
              originalSize,
              processedSize: pngBuffer.length,
              processingTime,
              format: 'png',
            },
          };
        } catch (conversionError) {
          console.error('Failed to convert SVG to PNG:', conversionError);
          // Fallback to returning the SVG if conversion fails
          const resultBase64 = Buffer.from(resultBuffer).toString('base64');
          const resultUrl = `data:image/svg+xml;base64,${resultBase64}`;

          return {
            status: 'error',
            error: 'Failed to convert to PNG, returning SVG instead',
            url: resultUrl,
            metadata: {
              originalSize,
              processedSize: resultBuffer.byteLength,
              processingTime,
              format: 'svg',
            },
          };
        }
      }

      // For SVG and PDF, return as before
      const resultBase64 = Buffer.from(resultBuffer).toString('base64');
      const mimeType =
        options.format === 'pdf' ? 'application/pdf' : 'image/svg+xml';
      const resultUrl = `data:${mimeType};base64,${resultBase64}`;

      return {
        status: 'success',
        url: resultUrl,
        metadata: {
          originalSize,
          processedSize: resultBuffer.byteLength,
          processingTime,
          format: options.format || 'svg',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Vectorization failed',
        metadata: {
          originalSize: 0,
          processedSize: 0,
          processingTime: Date.now() - startTime,
          format: options.format || 'svg',
        },
      };
    }
  }

  /**
   * Get account info from Vectorizer.ai (for credit checking)
   */
  async getAccountInfo(): Promise<{
    credits: number;
    subscription: string;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${this.apiId}:${this.apiSecret}`).toString('base64'),
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        credits: data.credits || 0,
        subscription: data.subscription || 'free',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate image for vectorization
   */
  async validateImage(file: File): Promise<{ valid: boolean; error?: string }> {
    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/bmp',
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a JPEG, PNG, WebP, or BMP image file.',
      };
    }

    // Check file size (Vectorizer.ai has limits)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image size must be less than 50MB.',
      };
    }

    // Check minimum dimensions
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 32 || img.height < 32) {
          resolve({
            valid: false,
            error: 'Image must be at least 32x32 pixels.',
          });
        } else if (img.width > 8000 || img.height > 8000) {
          resolve({
            valid: false,
            error: 'Image must be less than 8000x8000 pixels.',
          });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Unable to read image file.',
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Check if Vectorizer.ai service is available
   */
  isAvailable(): boolean {
    return !!this.apiId && !!this.apiSecret;
  }
}

// Export singleton instance
export const vectorizerService = new VectorizerService();
