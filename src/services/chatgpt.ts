import { env } from '@/config/env';

export interface ImageGenerationOptions {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024'; // GPT-Image-1 sizes
  quality?: 'standard' | 'hd'; // Keep for backwards compatibility
  style?: 'vivid' | 'natural'; // Keep for backwards compatibility
  n?: number; // Number of images to generate
}

export interface ImageEditOptions {
  prompt: string;
  image: Buffer | string; // Base64 string or Buffer of the image to edit
  mask?: Buffer | string; // Optional mask for selective editing
  size?: '256x256' | '512x512' | '1024x1024';
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

// Credit costs for GPT-Image-1 (Beta pricing - based on size)
const CREDIT_COSTS = {
  '256x256': 1,   // Small size uses 1 credit
  '512x512': 1,   // Medium size uses 1 credit  
  '1024x1024': 1, // Large size uses 1 credit (Beta pricing)
};

export class ChatGPTService {
  /**
   * Generate images using OpenAI's GPT-Image-1 model
   * This method should only be called from server-side code (API routes)
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
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
      console.log('[ChatGPT Service] API key status:', apiKey ? 'Found' : 'Missing');
      
      if (!apiKey) {
        console.error('[ChatGPT Service] OpenAI API key is not configured in environment');
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.');
      }
      
      // Initialize OpenAI client (server-side only)
      console.log('[ChatGPT Service] Initializing OpenAI client...');
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Default options
      const {
        prompt,
        size = '1024x1024',
        n = 1,
      } = options;

      // GPT-Image-1 image count
      const imageCount = Math.min(Math.max(n, 1), 10);

      console.log('[ChatGPT Service] Generating image with GPT-Image-1:', {
        prompt: prompt.substring(0, 100) + '...',
        size,
        n: imageCount,
      });

      // Make the API call to generate image
      console.log('[ChatGPT Service] Calling OpenAI API...');
      let response;
      try {
        // Use GPT-Image-1 for image generation
        const generateParams: any = {
          model: 'gpt-image-1',
          prompt: prompt.replace('[IMAGE-TO-IMAGE]', ''), // Remove marker if present
          size,
          n: imageCount,
        };
        
        // Add quality parameter if specified
        if (options.quality) {
          generateParams.quality = options.quality === 'hd' ? 'high' : 'low';
        }
        
        response = await openai.images.generate(generateParams);
        console.log('[ChatGPT Service] OpenAI API call successful');
        console.log('[ChatGPT Service] Response data:', JSON.stringify(response, null, 2));
      } catch (apiError: unknown) {
        console.error('[ChatGPT Service] OpenAI API error:', apiError);
        const err = apiError as Error;
        console.error('[ChatGPT Service] Error details:', (err as Error & {response?: {data?: unknown}}).response?.data || err.message);
        throw new Error(`OpenAI API error: ${(apiError as Error).message || 'Failed to generate image'}`);
      }

      // Extract the generated images
      console.log('[ChatGPT Service] Extracting images from response...');
      console.log('[ChatGPT Service] response.data:', response.data);
      
      // Extract images - gpt-image-1 returns b64_json directly
      const images: GeneratedImage[] = response.data?.map(image => ({
        url: image.b64_json ? `data:image/png;base64,${image.b64_json}` : image.url || '',
        revised_prompt: undefined, // GPT-Image-1 doesn't revise prompts
      })) || [];
      console.log('[ChatGPT Service] Extracted images:', images);

      // Calculate credits used based on size and count
      const creditsPerImage = CREDIT_COSTS[size] || 2;
      const creditsUsed = creditsPerImage * imageCount;

      console.log('Image generation successful:', {
        count: images.length,
        creditsUsed,
        size,
      });

      return {
        success: true,
        images,
        creditsUsed,
      };
    } catch (error: unknown) {
      console.error('[ChatGPT Service] Image generation error:', error);
      console.error('[ChatGPT Service] Error stack:', error.stack);

      // Handle specific OpenAI errors
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.error?.message || error.message;

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
              error: 'Your prompt violates OpenAI content policy. Please modify your prompt.',
            };
          }
          return {
            success: false,
            error: `Invalid request: ${errorMessage}`,
          };
        } else if (statusCode === 500 || statusCode === 503) {
          return {
            success: false,
            error: 'OpenAI service is temporarily unavailable. Please try again later.',
          };
        }
      }

      // Generic error
      return {
        success: false,
        error: error.message || 'Failed to generate image. Please try again.',
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
      console.log('[ChatGPT Service] API key status:', apiKey ? 'Found' : 'Missing');
      
      if (!apiKey) {
        console.error('[ChatGPT Service] OpenAI API key is not configured in environment');
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.');
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
        n = 1,
      } = options;

      const imageCount = Math.min(Math.max(n, 1), 10);

      console.log('[ChatGPT Service] Editing image with GPT-Image-1:', {
        prompt: prompt.substring(0, 100) + '...',
        size,
        n: imageCount,
        hasMask: !!mask,
      });

      // Convert image to File object if it's a Buffer or base64 string
      let imageFile;
      if (Buffer.isBuffer(image)) {
        imageFile = await toFile(image, 'image.png', { type: 'image/png' });
      } else if (typeof image === 'string') {
        // If it's a base64 string, convert to Buffer first
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        imageFile = await toFile(buffer, 'image.png', { type: 'image/png' });
      } else {
        throw new Error('Invalid image format. Expected Buffer or base64 string.');
      }

      // Convert mask to File object if provided
      let maskFile;
      if (mask) {
        if (Buffer.isBuffer(mask)) {
          maskFile = await toFile(mask, 'mask.png', { type: 'image/png' });
        } else if (typeof mask === 'string') {
          const buffer = Buffer.from(mask.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          maskFile = await toFile(buffer, 'mask.png', { type: 'image/png' });
        }
      }

      // Make the API call to edit image
      console.log('[ChatGPT Service] Calling OpenAI API for image edit...');
      let response;
      try {
        const editParams: any = {
          model: 'gpt-image-1',
          image: imageFile,
          prompt,
          size,
          n: imageCount,
        };

        if (maskFile) {
          editParams.mask = maskFile;
        }

        response = await openai.images.edit(editParams);
        console.log('[ChatGPT Service] OpenAI API call successful');
      } catch (apiError: unknown) {
        console.error('[ChatGPT Service] OpenAI API error:', apiError);
        const err = apiError as Error;
        console.error('[ChatGPT Service] Error details:', (err as Error & {response?: {data?: unknown}}).response?.data || err.message);
        throw new Error(`OpenAI API error: ${(apiError as Error).message || 'Failed to edit image'}`);
      }

      // Extract the edited images
      console.log('[ChatGPT Service] Extracting edited images from response...');
      
      // Convert base64 images to data URLs
      const images: GeneratedImage[] = response.data?.map(img => ({
        url: img.b64_json ? `data:image/png;base64,${img.b64_json}` : img.url!,
        revised_prompt: undefined,
      })) || [];

      // Calculate credits used based on size and count
      const creditsPerImage = CREDIT_COSTS[size] || 2;
      const creditsUsed = creditsPerImage * imageCount;

      console.log('Image editing successful:', {
        count: images.length,
        creditsUsed,
        size,
      });

      return {
        success: true,
        images,
        creditsUsed,
      };
    } catch (error: unknown) {
      console.error('[ChatGPT Service] Image editing error:', error);
      
      // Handle specific OpenAI errors
      const errorWithResponse = error as Error & {response?: {status: number; data?: {error?: {message?: string}}}};
      if (errorWithResponse.response) {
        const statusCode = errorWithResponse.response.status;
        const errorMessage = errorWithResponse.response.data?.error?.message || (error as Error).message;

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
              error: 'Your prompt violates OpenAI content policy. Please modify your prompt.',
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
        error: (error as Error).message || 'Failed to edit image. Please try again.',
      };
    }
  }

}

// Export singleton instance
export const chatGPTService = new ChatGPTService();