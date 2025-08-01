import { env } from '@/config/env';

export type ProcessingMode = 'auto_enhance' | 'generative_upscale' | 'basic_upscale';

export interface UpscaleOptions {
  scale: 2 | 4;
  processingMode: ProcessingMode;
  faceEnhance?: boolean;
  type?: 'photo' | 'artwork';
}

export interface UpscaleResponse {
  status: 'success' | 'error';
  url?: string;
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
      // Build request body based on API documentation
      const requestBody: Record<string, unknown> = {
        url: imageUrl,
        output_format: 'png' // Use PNG for better quality
      };

      // Set dimensions based on scale using percentage format
      // According to the docs, use "200%" for 2x scale, "400%" for 4x scale
      if (options.scale === 2) {
        requestBody.width = "200%";
        requestBody.height = "200%";
      } else if (options.scale === 4) {
        requestBody.width = "400%";
        requestBody.height = "400%";
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
        requestBody: {
          ...requestBody,
          url: requestBody.url?.substring(0, 100) + '...' // Truncate long data URLs for logging
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
        return { 
          status: 'success', 
          url: result.result_url, 
          processingTime: result.processing_time 
        };
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
          return { 
            status: 'success', 
            url: result.result_url, 
            processingTime: result.processing_time 
          };
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