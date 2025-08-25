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
    this.authHeader = 'Basic ' + Buffer.from(this.apiId + ':' + this.apiSecret).toString('base64');
  }

  /**
   * Remove background from an image using ClippingMagic API
   */
  async removeBackground(
    imageUrl: string,
    options: ClippingMagicOptions = {}
  ): Promise<ClippingMagicResult> {
    if (!this.apiId || !this.apiSecret) {
      return { status: 'error', error: 'ClippingMagic API credentials are not configured' };
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
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const originalSize = imageBlob.size;

      // Step 1: Upload image to ClippingMagic
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');
      formData.append('format', 'json'); // Get JSON response with image ID and secret
      
      // Remove test parameter - we want actual processing
      // formData.append('test', 'true');

      // Upload image to get ID and secret
      const uploadResponse = await fetch(`${this.baseUrl}/images`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.text();
        throw new Error(`ClippingMagic upload error: ${uploadResponse.status} - ${errorData}`);
      }

      const uploadResult = await uploadResponse.json();
      const imageId = uploadResult.image?.id;
      const imageSecret = uploadResult.image?.secret;

      if (!imageId || !imageSecret) {
        throw new Error('Failed to get image ID from ClippingMagic');
      }

      // Step 2: Wait for processing and check status
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait (increased from 30)
      let resultReady = false;
      
      while (attempts < maxAttempts && !resultReady) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Check if result is ready
        const statusResponse = await fetch(`${this.baseUrl}/images/${imageId}`, {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.resultRevision && statusData.resultRevision > 0) {
            resultReady = true;
          }
        }
        
        attempts++;
      }
      
      if (!resultReady) {
        throw new Error('Background removal timed out. Please try again.');
      }
      
      // Step 3: Download the processed result
      const resultUrl = `${this.baseUrl}/images/${imageId}`;
      const resultParams = new URLSearchParams();
      
      // Add format options for download
      if (options.format) {
        resultParams.append('format', options.format);
      } else {
        resultParams.append('format', 'png'); // Default to PNG for transparency
      }
      
      // CRITICAL: Set DPI to 300 for print-ready output (DTF requires high DPI)
      resultParams.append('output.dpi', '300');
      
      // CRITICAL: Request at INPUT size (original uploaded dimensions)
      resultParams.append('size', 'input');
      
      if (options.backgroundColor && options.format === 'jpg') {
        resultParams.append('background_color', options.backgroundColor);
      }
      
      if (options.quality && options.format === 'jpg') {
        resultParams.append('quality', options.quality.toString());
      }

      // Retrieve the result
      const resultResponse = await fetch(`${resultUrl}?${resultParams}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      const processingTime = Date.now() - startTime;

      if (!resultResponse.ok) {
        const errorData = await resultResponse.text();
        throw new Error(`ClippingMagic result error: ${resultResponse.status} - ${errorData}`);
      }

      // Get the processed image
      const resultBlob = await resultResponse.blob();
      
      // Convert blob to data URL for immediate use
      const processedUrl = await this.blobToDataUrl(resultBlob);

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
        error: error instanceof Error ? error.message : 'Background removal failed',
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
          'Authorization': this.authHeader,
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
    return new Promise((resolve) => {
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