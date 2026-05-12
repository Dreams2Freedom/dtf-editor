import { env } from '@/config/env';

export interface ClippingMagicOptions {
  format?: 'png' | 'jpg';
  backgroundColor?: string;
  quality?: number; // 0.1 to 1.0 for JPG
  transparent?: boolean; // For PNG format
}

export interface ClippingMagicResult {
  status: 'success' | 'error';
  url?: string;
  error?: string;
  metadata?: {
    originalSize: number;
    processedSize: number;
    processingTime: number;
  };
}

export class ClippingMagicService {
  private apiId: string;
  private apiSecret: string;
  private baseUrl = 'https://clippingmagic.com/api/v1';
  private authHeader: string;

  constructor() {
    this.apiId = env.CLIPPINGMAGIC_API_KEY;
    this.apiSecret = env.CLIPPINGMAGIC_API_SECRET || '';

    // Debug environment variables - commented out for production
    // console.log('Raw env values:', {
    //   CLIPPINGMAGIC_API_KEY: process.env.CLIPPINGMAGIC_API_KEY,
    //   CLIPPINGMAGIC_API_SECRET: process.env.CLIPPINGMAGIC_API_SECRET ? 'EXISTS' : 'MISSING',
    //   secretLength: process.env.CLIPPINGMAGIC_API_SECRET?.length || 0
    // });

    // console.log('ClippingMagic Service Init:', {
    //   hasApiId: !!this.apiId,
    //   hasApiSecret: !!this.apiSecret,
    //   apiIdLength: this.apiId?.length,
    //   apiSecretLength: this.apiSecret?.length,
    //   envValue: env.CLIPPINGMAGIC_API_SECRET ? 'EXISTS' : 'MISSING',
    //   directEnvValue: process.env.CLIPPINGMAGIC_API_SECRET || 'NOT_FOUND'
    // });

    // Force use of process.env directly as a workaround
    if (!this.apiSecret && process.env.CLIPPINGMAGIC_API_SECRET) {
      // console.log('Using direct env value as workaround');
      this.apiSecret = process.env.CLIPPINGMAGIC_API_SECRET;
    }

    // Create Basic Auth header
    this.authHeader =
      'Basic ' +
      Buffer.from(this.apiId + ':' + this.apiSecret).toString('base64');
  }

  /**
   * Remove background from an image using ClippingMagic API
   */
  async removeBackground(
    imageUrl: string,
    options: ClippingMagicOptions = {}
  ): Promise<ClippingMagicResult> {
    if (!this.apiId || !this.apiSecret) {
      return {
        status: 'error',
        error: 'ClippingMagic API credentials are not configured',
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

      // Determine file extension from content type for proper filename
      const contentType = imageBlob.type || 'image/png';
      const ext = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : 'jpg';

      // Use format=result for headless auto-clip (processes and returns result directly)
      const formData = new FormData();
      formData.append('image', imageBlob, `image.${ext}`);
      formData.append('format', 'result'); // Headless: returns processed image directly
      formData.append('maxPixels', '26214400'); // Preserve full resolution up to 26.2 megapixels
      formData.append('processing.mode', 'graphics'); // Graphics mode for DTF
      formData.append('output.dpi', '300'); // Print-ready 300 DPI
      formData.append('result.allowEnlarging', 'true'); // Maintain full input size

      if (options.backgroundColor && options.format === 'jpg') {
        formData.append('background_color', options.backgroundColor);
      }
      if (options.quality && options.format === 'jpg') {
        formData.append('quality', options.quality.toString());
      }

      // Single request: upload → auto-process → result returned directly
      const response = await fetch(`${this.baseUrl}/images`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
        },
        body: formData,
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `ClippingMagic error: ${response.status} - ${errorData}`
        );
      }

      // Response IS the processed image (binary PNG) — no polling needed
      const resultBlob = await response.blob();

      // Convert to data URL using Buffer (server-side)
      const buffer = Buffer.from(await resultBlob.arrayBuffer());
      const processedUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      return {
        status: 'success',
        url: processedUrl,
        metadata: {
          originalSize,
          processedSize: resultBlob.size,
          processingTime,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Background removal failed',
        metadata: {
          originalSize: 0,
          processedSize: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Convert blob to data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get account info from ClippingMagic (for credit checking)
   */
  async getAccountInfo(): Promise<{
    credits: number;
    subscription: string;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          Authorization: this.authHeader,
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
    } catch {
      return null;
    }
  }

  /**
   * Validate image for background removal
   */
  validateImage(file: File): Promise<{ valid: boolean; error?: string }> {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return Promise.resolve({
        valid: false,
        error: 'Please upload a JPEG, PNG, or WebP image file.',
      });
    }

    // Check file size (ClippingMagic has limits)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return Promise.resolve({
        valid: false,
        error: 'Image size must be less than 25MB.',
      });
    }

    // Check minimum dimensions
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 50 || img.height < 50) {
          resolve({
            valid: false,
            error: 'Image must be at least 50x50 pixels.',
          });
        } else if (img.width > 10000 || img.height > 10000) {
          resolve({
            valid: false,
            error: 'Image must be less than 10000x10000 pixels.',
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
   * Check if ClippingMagic service is available
   */
  isAvailable(): boolean {
    return !!this.apiId && !!this.apiSecret;
  }
}

// Export singleton instance
export const clippingMagicService = new ClippingMagicService();
