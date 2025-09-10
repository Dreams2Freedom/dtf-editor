import { env } from '@/config/env';

export type ProcessingMode = 'auto_enhance' | 'generative_upscale' | 'basic_upscale';

export interface UpscaleOptions {
  scale?: 2 | 4;  // Made optional for when we use exact dimensions
  processingMode: ProcessingMode;
  faceEnhance?: boolean;
  type?: 'photo' | 'artwork';
  // New options for exact dimensions (for DPI-aware upscaling)
  targetWidth?: number;
  targetHeight?: number;
}

export interface UpscaleResponse {
  status: 'success' | 'error';
  url?: string;
  originalUrl?: string;
  processingTime?: number;
  error?: string;
}

export class DeepImageService {
  private apiKey: string;
  private baseUrl = 'https://deep-image.ai/rest_api/process_result';

  constructor() {
    this.apiKey = env.DEEP_IMAGE_API_KEY;
    if (!this.apiKey && typeof window === 'undefined') {
      console.warn('Deep-Image.ai API key not found in environment variables');
    }
  }

  public async upscaleImage(imageUrl: string, options: UpscaleOptions): Promise<UpscaleResponse> {
    if (!this.apiKey) {
      return { status: 'error', error: 'Deep-Image.ai API key is not configured' };
    }

    try {
      // Check if the imageUrl is a data URL
      let finalImageUrl = imageUrl;
      if (imageUrl.startsWith('data:')) {
        console.log('[DeepImage] Received data URL, need to convert to HTTP URL first');
        
        // Convert data URL to blob and upload to temporary storage
        try {
          // Import storage service dynamically to avoid circular dependencies
          const { storageService } = await import('@/services/storage');
          
          // Convert data URL to blob
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // Create a File object from the blob
          const file = new File([blob], 'temp_image.png', { type: blob.type });
          
          // Upload to storage
          const uploadResult = await storageService.uploadFile(file);
          
          if (uploadResult.success && uploadResult.url) {
            finalImageUrl = uploadResult.url;
            console.log('[DeepImage] Successfully uploaded data URL to storage:', finalImageUrl);
          } else {
            return { 
              status: 'error', 
              error: 'Failed to upload image to storage. Deep-Image requires HTTP URLs, not data URLs.' 
            };
          }
        } catch (uploadError) {
          console.error('[DeepImage] Error converting data URL:', uploadError);
          return { 
            status: 'error', 
            error: 'Failed to process image data. Please try uploading the image file directly.' 
          };
        }
      }
      
      // Build request body based on API documentation
      const requestBody: Record<string, unknown> = {
        url: finalImageUrl,
        output_format: 'png', // MUST be lowercase: 'jpeg', 'jpg', 'png', or 'webp' per Deep-Image API docs
        quality: 100 // Maximum quality for PNG (lossless anyway, but we set it)
      };

      // Set dimensions based on either exact pixels or scale percentage
      if (options.targetWidth && options.targetHeight) {
        // Use exact pixel dimensions for DPI-aware upscaling
        requestBody.width = options.targetWidth;
        requestBody.height = options.targetHeight;
      } else if (options.scale) {
        // Use percentage format for traditional scaling
        // According to the docs, use "200%" for 2x scale, "400%" for 4x scale
        if (options.scale === 2) {
          requestBody.width = "200%";
          requestBody.height = "200%";
        } else if (options.scale === 4) {
          requestBody.width = "400%";
          requestBody.height = "400%";
        }
      } else {
        // Default to 2x if no dimensions specified
        requestBody.width = "200%";
        requestBody.height = "200%";
      }

      // Apply processing mode specific settings using enhancements array
      const enhancements: string[] = [];
      
      if (options.processingMode === 'auto_enhance') {
        // Auto enhance mode uses multiple enhancements
        enhancements.push('denoise', 'deblur', 'light', 'color');
        
        // Add light and color parameters for HDR enhancement
        requestBody.light_parameters = {
          type: 'hdr_light_advanced',
          level: 0.8
        };
        requestBody.color_parameters = {
          type: 'hdr_light_advanced',
          level: 0.5
        };
      } else if (options.processingMode === 'generative_upscale') {
        // Generative upscale for better quality on large scale factors
        enhancements.push('denoise', 'deblur', 'light', 'color');
        // Add more aggressive enhancement for generative upscale
        requestBody.light_parameters = {
          type: 'hdr_light_advanced',
          level: 1.0
        };
        requestBody.color_parameters = {
          type: 'hdr_light_advanced',
          level: 0.8
        };
      } else {
        // Basic upscale - just resize with minimal processing
        // Don't add any enhancements
      }

      if (enhancements.length > 0) {
        requestBody.enhancements = enhancements;
      }

      // Add face enhancement if requested
      if (options.faceEnhance && options.processingMode !== 'basic_upscale') {
        if (!requestBody.enhancements) {
          requestBody.enhancements = [];
        }
        (requestBody.enhancements as string[]).push('face_enhance');
      }

      console.log('Deep-Image API request:', {
        url: this.baseUrl,
        hasApiKey: !!this.apiKey,
        output_format: requestBody.output_format, // Explicitly log the format
        requestBody: {
          ...requestBody,
          url: typeof requestBody.url === 'string' ? requestBody.url.substring(0, 100) + '...' : requestBody.url // Truncate long URLs for logging
        }
      });

      // Make the API request
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Deep-Image.ai API error:', {
          status: response.status,
          statusText: response.statusText,
          responseText,
          requestBody
        });
        
        // Try to parse error message from response
        let errorMessage = `Deep-Image.ai API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message;
          }
        } catch (e) {
          // If response is not JSON, include the text
          if (responseText && responseText.length < 200) {
            errorMessage += ` - ${responseText}`;
          }
        }
        
        return { 
          status: 'error', 
          error: errorMessage
        };
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        return { status: 'error', error: 'Invalid response from Deep-Image.ai API' };
      }

      // Handle immediate result
      if (result.status === 'complete' && result.result_url) {
        console.log('[DeepImage] Processing complete:', {
          url: result.result_url,
          format: result.output_format,
          requestedFormat: requestBody.output_format
        });
        
        // TEMPORARY FIX: Return the original URL directly
        // Converting to data URLs causes navigation issues with "about:blank#blocked"
        // The upscale API endpoint will handle downloading and saving to storage
        return { 
          status: 'success', 
          url: result.result_url,  // Return the original URL from Deep-Image
          processingTime: result.processing_time 
        };
        
        // OLD CODE: Downloaded and converted to data URL (caused navigation issues)
        /*
        // Download the image immediately since Deep-Image URLs expire quickly
        try {
          console.log('[DeepImage] Downloading processed image immediately...');
          const downloadResponse = await fetch(result.result_url);
          
          if (!downloadResponse.ok) {
            console.error('[DeepImage] Failed to download processed image:', downloadResponse.status);
            return { 
              status: 'success', 
              url: result.result_url, 
              processingTime: result.processing_time 
            };
          }
          
          // Convert to base64 data URL to preserve the image
          const buffer = await downloadResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = downloadResponse.headers.get('content-type') || 'image/png';
          const dataUrl = `data:${contentType};base64,${base64}`;
          
          console.log('[DeepImage] Successfully converted to data URL, size:', base64.length);
          
          return { 
            status: 'success', 
            url: dataUrl,  // Return data URL instead of temporary URL
            originalUrl: result.result_url,  // Keep original for reference
            processingTime: result.processing_time 
          };
        } catch (downloadError) {
          console.error('[DeepImage] Error downloading image:', downloadError);
          // Fallback to returning the original URL
          return { 
            status: 'success', 
            url: result.result_url, 
            processingTime: result.processing_time 
          };
        }
        */
      } 
      
      // Handle job that needs polling
      else if (result.job) {
        return this.pollForResult(result.job);
      } 
      
      // Handle errors
      else if (result.error) {
        return { 
          status: 'error', 
          error: result.error 
        };
      }
      
      // Unexpected response
      else {
        return { 
          status: 'error', 
          error: 'Unexpected response from Deep-Image.ai API' 
        };
      }
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Failed to connect to Deep-Image.ai API' };
    }
  }

  private async pollForResult(jobHash: string, maxRetries = 24, delayMs = 5000): Promise<UpscaleResponse> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait before polling (except on first attempt)
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        const response = await fetch(`https://deep-image.ai/rest_api/result/${jobHash}`, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
          },
        });

        if (!response.ok) {
          if (attempt === maxRetries) {
            return { 
              status: 'error', 
              error: `Polling failed after ${maxRetries} attempts: ${response.status} ${response.statusText}` 
            };
          }
          continue;
        }

        const result = await response.json();
        // Job completed successfully
        if (result.status === 'complete' && result.result_url) {
          console.log('[DeepImage] Polling complete, URL:', result.result_url);
          
          // TEMPORARY FIX: Return the original URL directly (same as immediate results)
          return { 
            status: 'success', 
            url: result.result_url,  // Return the original URL from Deep-Image
            processingTime: result.processing_time 
          };
          
          // OLD CODE: Downloaded and converted to data URL (caused navigation issues)
          /*
          // Download the image immediately since Deep-Image URLs expire quickly
          try {
            console.log('[DeepImage] Downloading polled image immediately...');
            const downloadResponse = await fetch(result.result_url);
            
            if (!downloadResponse.ok) {
              console.error('[DeepImage] Failed to download polled image:', downloadResponse.status);
              return { 
                status: 'success', 
                url: result.result_url, 
                processingTime: result.processing_time 
              };
            }
            
            // Convert to base64 data URL to preserve the image
            const buffer = await downloadResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const contentType = downloadResponse.headers.get('content-type') || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64}`;
            
            console.log('[DeepImage] Successfully converted polled image to data URL, size:', base64.length);
            
            return { 
              status: 'success', 
              url: dataUrl,  // Return data URL instead of temporary URL
              originalUrl: result.result_url,  // Keep original for reference
              processingTime: result.processing_time 
            };
          } catch (downloadError) {
            console.error('[DeepImage] Error downloading polled image:', downloadError);
            // Fallback to returning the original URL
            return { 
              status: 'success', 
              url: result.result_url, 
              processingTime: result.processing_time 
            };
          }
          */
        } 
        
        // Job still processing
        else if (result.status === 'processing' || result.status === 'not_started' || result.status === 'queued') {
          if (attempt === maxRetries) {
            return { 
              status: 'error', 
              error: `Job did not complete after ${maxRetries * delayMs / 1000} seconds` 
            };
          }
          continue;
        } 
        
        // Job failed
        else if (result.status === 'failed' || result.status === 'error') {
          return { 
            status: 'error', 
            error: result.error || result.message || 'Job failed during processing' 
          };
        } 
        
        // Unexpected status
        else {
          return { 
            status: 'error', 
            error: `Unexpected job status: ${result.status}` 
          };
        }
      } catch (error) {
        if (attempt === maxRetries) {
          return { 
            status: 'error', 
            error: `Polling failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }
    }

    return { 
      status: 'error', 
      error: 'Polling timeout - job did not complete in time' 
    };
  }
}

export const deepImageService = new DeepImageService();