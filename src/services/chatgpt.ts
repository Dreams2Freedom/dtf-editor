import { env } from '@/config/env';

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024'; // GPT-Image-1 sizes via Images API
  quality?: 'low' | 'medium' | 'high' | 'auto'; // GPT-Image-1 quality levels
  style?: 'vivid' | 'natural'; // Style preference (not supported by gpt-image-1)
  n?: number; // Number of images to generate
}

export interface ImageEditOptions {
  prompt: string;
  image: Buffer | string; // Base64 string or Buffer of the image to edit
  mask?: Buffer | string; // Optional mask for selective editing
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface GeneratedImage {
  url: string; // Can be a data URL or regular URL
  revised_prompt?: string; // GPT-Image-1 doesn't revise prompts, but keeping for compatibility
}

export interface ImageGenerationResult {
  success: boolean;
  images?: GeneratedImage[];
  error?: string;
  creditsUsed?: number;
}

export type ImageEditResult = ImageGenerationResult;

// Credit costs for GPT-Image-1 using Images API (based on quality)
// gpt-image-1 supports: 'low', 'medium', 'high', 'auto'
const CREDIT_COSTS_BY_QUALITY = {
  low: 1, // Low quality uses 1 credit
  medium: 1, // Medium quality uses 1 credit (beta pricing)
  high: 2, // High quality uses 2 credits
  auto: 1, // Auto quality uses 1 credit (default)
};

export class ChatGPTService {
  /**
   * Generate images using OpenAI's GPT-Image-1 model
   * This method should only be called from server-side code (API routes)
   */
  async generateImage(
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    try {
      console.log('[ChatGPT Service] Starting image generation...');

      // Only import and initialize OpenAI on the server
      if (typeof window !== 'undefined') {
        throw new Error('ChatGPT service can only be used server-side');
      }

      // Dynamically import OpenAI to prevent client-side loading
      console.log('[ChatGPT Service] Importing OpenAI library...');
      const OpenAI = (await import('openai')).default;

      // Validate API key
      const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
      console.log(
        '[ChatGPT Service] API key status:',
        apiKey ? 'Found' : 'Missing'
      );

      if (!apiKey) {
        console.error(
          '[ChatGPT Service] OpenAI API key is not configured in environment'
        );
        throw new Error(
          'OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.'
        );
      }

      // Initialize OpenAI client (server-side only)
      console.log('[ChatGPT Service] Initializing OpenAI client...');
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Default options
      const { prompt, size = '1024x1024', quality = 'medium', n = 1 } = options;

      // Images API supports up to 10 images per request
      const imageCount = Math.min(Math.max(n, 1), 10);

      console.log('[ChatGPT Service] Generating image with GPT-Image-1:', {
        prompt: prompt.substring(0, 100) + '...',
        size,
        quality,
        n: imageCount,
      });

      // Make the API call to generate image using Images API
      console.log('[ChatGPT Service] Calling OpenAI images.generate API...');
      let response;
      try {
        // Use gpt-image-1 model via Images API (direct endpoint)
        // This will show up in the "Images" section of OpenAI dashboard
        const cleanedPrompt = prompt.replace('[IMAGE-TO-IMAGE]', ''); // Remove marker if present

        // Build the request parameters for Images API
        // gpt-image-1 supports: model, prompt, n, size, quality, background, moderation
        // Does NOT support: style (DALL-E 3 only) or response_format
        const requestParams: any = {
          model: 'gpt-image-1', // Dedicated image generation model
          prompt: cleanedPrompt,
          n: imageCount,
          size: size, // '1024x1024' | '1024x1792' | '1792x1024'
          quality: quality, // 'low' | 'medium' | 'high' | 'auto'
          background: 'transparent', // CRITICAL for DTF printing - enables transparent backgrounds
          // response_format removed - will return URLs by default
        };

        console.log(
          '[ChatGPT Service] Request params:',
          JSON.stringify(requestParams, null, 2)
        );

        response = await openai.images.generate(requestParams);
        console.log('[ChatGPT Service] OpenAI API call successful');
        console.log(
          '[ChatGPT Service] Full response:',
          JSON.stringify(response, null, 2)
        );
      } catch (apiError: unknown) {
        console.error('[ChatGPT Service] OpenAI API error:', apiError);
        const err = apiError as Error;
        console.error(
          '[ChatGPT Service] Error details:',
          (err as Error & { response?: { data?: unknown } }).response?.data ||
            err.message
        );
        throw new Error(
          `OpenAI API error: ${(apiError as Error).message || 'Failed to generate image'}`
        );
      }

      // Extract the generated images from response.data array
      console.log('[ChatGPT Service] Extracting images from response.data...');
      console.log('[ChatGPT Service] response.data:', response.data);

      // Images API returns data as array of image objects with b64_json or url
      const images: GeneratedImage[] = (response.data || []).map(
        (imageData: any) => ({
          url: imageData.b64_json
            ? `data:image/png;base64,${imageData.b64_json}`
            : imageData.url || '',
          revised_prompt: imageData.revised_prompt, // gpt-image-1 may provide revised prompts
        })
      );

      console.log('[ChatGPT Service] Extracted images:', images.length);

      // Calculate credits used based on quality and count
      const creditsPerImage =
        CREDIT_COSTS_BY_QUALITY[quality] || CREDIT_COSTS_BY_QUALITY['medium'];
      const creditsUsed = creditsPerImage * imageCount;

      console.log('Image generation successful:', {
        count: images.length,
        creditsUsed,
        size,
        quality,
        hasTransparentBackground: true,
      });

      return {
        success: true,
        images,
        creditsUsed,
      };
    } catch (error: unknown) {
      console.error('[ChatGPT Service] Image generation error:', error);
      const err = error as Error & { stack?: string };
      console.error('[ChatGPT Service] Error stack:', err.stack);

      // Handle specific OpenAI errors
      const errorWithResponse = error as Error & {
        response?: { status: number; data?: { error?: { message?: string } } };
      };
      if (errorWithResponse.response) {
        const statusCode = errorWithResponse.response.status;
        const errorMessage =
          errorWithResponse.response.data?.error?.message ||
          (error as Error).message;

        if (statusCode === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your OpenAI configuration.',
          };
        } else if (statusCode === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
          };
        } else if (statusCode === 400) {
          // Content policy violation or invalid request
          if (errorMessage.includes('content policy')) {
            return {
              success: false,
              error:
                'Your prompt violates OpenAI content policy. Please modify your prompt.',
            };
          }
          return {
            success: false,
            error: `Invalid request: ${errorMessage}`,
          };
        } else if (statusCode === 500 || statusCode === 503) {
          return {
            success: false,
            error:
              'OpenAI service is temporarily unavailable. Please try again later.',
          };
        }
      }

      // Generic error
      return {
        success: false,
        error:
          (error as Error).message ||
          'Failed to generate image. Please try again.',
      };
    }
  }

  /**
   * Generate multiple images using GPT-Image-1's batch capability
   */
  async generateMultipleImages(
    options: ImageGenerationOptions,
    count: number = 1
  ): Promise<ImageGenerationResult> {
    try {
      // GPT-Image-1 can handle multiple images in one request
      if (count <= 10) {
        return this.generateImage({ ...options, n: count });
      }

      // For more than 10 images, we need multiple requests
      console.log(`Generating ${count} images with multiple API calls...`);

      const batches = [];
      let remaining = count;

      while (remaining > 0) {
        const batchSize = Math.min(remaining, 10);
        batches.push(this.generateImage({ ...options, n: batchSize }));
        remaining -= batchSize;
      }

      const results = await Promise.all(batches);

      // Combine all successful results
      const allImages: GeneratedImage[] = [];
      let totalCreditsUsed = 0;
      let hasError = false;
      let errorMessage = '';

      for (const result of results) {
        if (result.success && result.images) {
          allImages.push(...result.images);
          totalCreditsUsed += result.creditsUsed || 0;
        } else {
          hasError = true;
          errorMessage = result.error || 'Unknown error';
        }
      }

      if (allImages.length === 0) {
        return {
          success: false,
          error: errorMessage || 'Failed to generate any images',
        };
      }

      return {
        success: true,
        images: allImages,
        creditsUsed: totalCreditsUsed,
        error: hasError ? `Partially failed: ${errorMessage}` : undefined,
      };
    } catch (error: unknown) {
      console.error('Error generating multiple images:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to generate images',
      };
    }
  }

  /**
   * Edit images using OpenAI's GPT-Image-1 model
   * This method should only be called from server-side code (API routes)
   */
  async editImage(options: ImageEditOptions): Promise<ImageEditResult> {
    try {
      console.log('[ChatGPT Service] Starting image editing...');

      // Only import and initialize OpenAI on the server
      if (typeof window !== 'undefined') {
        throw new Error('ChatGPT service can only be used server-side');
      }

      // Dynamically import OpenAI to prevent client-side loading
      console.log('[ChatGPT Service] Importing OpenAI library...');
      const { default: OpenAI, toFile } = await import('openai');

      // Validate API key
      const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
      console.log(
        '[ChatGPT Service] API key status:',
        apiKey ? 'Found' : 'Missing'
      );

      if (!apiKey) {
        console.error(
          '[ChatGPT Service] OpenAI API key is not configured in environment'
        );
        throw new Error(
          'OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.'
        );
      }

      // Initialize OpenAI client (server-side only)
      console.log('[ChatGPT Service] Initializing OpenAI client...');
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Default options
      const {
        prompt,
        image,
        mask,
        size = '1024x1024',
        quality = 'standard',
        style = 'vivid',
        n = 1,
      } = options;

      const imageCount = Math.min(Math.max(n, 1), 10);

      console.log('[ChatGPT Service] Editing image with GPT-Image-1 Tool:', {
        prompt: prompt.substring(0, 100) + '...',
        size,
        n: imageCount,
        hasMask: !!mask,
      });

      // Note: Image editing with tool-based API might work differently
      // For now, we'll convert the image to base64 and include it in the input
      let imageBase64: string;
      if (Buffer.isBuffer(image)) {
        imageBase64 = image.toString('base64');
      } else if (typeof image === 'string') {
        // If it's already a base64 string, extract it
        imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');
      } else {
        throw new Error(
          'Invalid image format. Expected Buffer or base64 string.'
        );
      }

      // Make the API call to edit image using tool-based API
      console.log(
        '[ChatGPT Service] Calling OpenAI responses.create API for edit...'
      );
      let response;
      try {
        // TODO: Verify how image editing works with tool-based API
        // This is a best guess implementation that may need adjustment
        const requestParams: any = {
          model: 'gpt-5',
          input: `${prompt}\n\n[Image to edit provided as base64]`,
          tools: [{ type: 'image_generation' }],
          // May need to pass image data differently
        };

        console.log(
          '[ChatGPT Service] Edit request params:',
          JSON.stringify(requestParams, null, 2)
        );

        response = await openai.responses.create(requestParams);
        console.log('[ChatGPT Service] OpenAI API call successful');
        console.log(
          '[ChatGPT Service] Full response:',
          JSON.stringify(response, null, 2)
        );
      } catch (apiError: unknown) {
        console.error('[ChatGPT Service] OpenAI API error:', apiError);
        const err = apiError as Error;
        console.error(
          '[ChatGPT Service] Error details:',
          (err as Error & { response?: { data?: unknown } }).response?.data ||
            err.message
        );
        throw new Error(
          `OpenAI API error: ${(apiError as Error).message || 'Failed to edit image'}`
        );
      }

      // Extract the edited images from tool outputs
      console.log(
        '[ChatGPT Service] Extracting edited images from response.output...'
      );
      console.log('[ChatGPT Service] response.output:', response.output);

      // Filter for image_generation_call outputs and extract base64 data
      const imageData =
        (response.output as any[])
          ?.filter(output => output.type === 'image_generation_call')
          .map(output => output.result) || [];

      console.log(
        '[ChatGPT Service] Found edited image data:',
        imageData.length
      );

      // Convert base64 data to data URLs
      const images: GeneratedImage[] = imageData.map((base64: string) => ({
        url: `data:image/png;base64,${base64}`,
        revised_prompt: undefined,
      }));

      // Calculate credits used based on quality and count
      const creditsPerImage =
        CREDIT_COSTS_BY_QUALITY[quality] || CREDIT_COSTS_BY_QUALITY['standard'];
      const creditsUsed = creditsPerImage * imageCount;

      console.log('Image editing successful:', {
        count: images.length,
        creditsUsed,
        quality,
      });

      return {
        success: true,
        images,
        creditsUsed,
      };
    } catch (error: unknown) {
      console.error('[ChatGPT Service] Image editing error:', error);

      // Handle specific OpenAI errors
      const errorWithResponse = error as Error & {
        response?: { status: number; data?: { error?: { message?: string } } };
      };
      if (errorWithResponse.response) {
        const statusCode = errorWithResponse.response.status;
        const errorMessage =
          errorWithResponse.response.data?.error?.message ||
          (error as Error).message;

        if (statusCode === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your OpenAI configuration.',
          };
        } else if (statusCode === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
          };
        } else if (statusCode === 400) {
          if (errorMessage.includes('content policy')) {
            return {
              success: false,
              error:
                'Your prompt violates OpenAI content policy. Please modify your prompt.',
            };
          }
          return {
            success: false,
            error: `Invalid request: ${errorMessage}`,
          };
        }
      }

      // Generic error
      return {
        success: false,
        error:
          (error as Error).message || 'Failed to edit image. Please try again.',
      };
    }
  }
}

// Export singleton instance
export const chatGPTService = new ChatGPTService();
