import { env } from '@/config/env';

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // Number of images to generate (1-10 for DALL-E 2, only 1 for DALL-E 3)
}

export interface GeneratedImage {
  url: string;
  revised_prompt?: string; // DALL-E 3 may revise the prompt
}

export interface ImageGenerationResult {
  success: boolean;
  images?: GeneratedImage[];
  error?: string;
  creditsUsed?: number;
}

// Credit costs for different quality levels
const CREDIT_COSTS = {
  standard: 2, // Standard quality uses 2 credits
  hd: 4, // HD quality uses 4 credits
};

export class ChatGPTService {
  /**
   * Generate images using OpenAI's DALL-E 3 model
   * Note: DALL-E 3 can only generate 1 image at a time
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
        quality = 'standard',
        style = 'vivid',
        n = 1,
      } = options;

      // DALL-E 3 only supports n=1
      if (n > 1) {
        console.warn('DALL-E 3 only supports generating 1 image at a time. Setting n=1.');
      }

      console.log('[ChatGPT Service] Generating image with DALL-E 3:', {
        prompt: prompt.substring(0, 100) + '...',
        size,
        quality,
        style,
      });

      // Make the API call to generate image
      console.log('[ChatGPT Service] Calling OpenAI API...');
      let response;
      try {
        response = await openai.images.generate({
          model: 'dall-e-3', // Using DALL-E 3 for best quality
          prompt,
          size,
          quality,
          style,
          n: 1, // DALL-E 3 only supports 1 image at a time
          response_format: 'url', // Get URLs instead of base64
        });
        console.log('[ChatGPT Service] OpenAI API call successful');
        console.log('[ChatGPT Service] Response data:', JSON.stringify(response, null, 2));
      } catch (apiError: unknown) {
        console.error('[ChatGPT Service] OpenAI API error:', apiError);
        const err = apiError as Error;
        console.error('[ChatGPT Service] Error details:', (err as any).response?.data || err.message);
        throw new Error(`OpenAI API error: ${(apiError as Error).message || 'Failed to generate image'}`);
      }

      // Extract the generated images
      console.log('[ChatGPT Service] Extracting images from response...');
      console.log('[ChatGPT Service] response.data:', response.data);
      const images: GeneratedImage[] = response.data?.map(image => ({
        url: image.url!,
        revised_prompt: image.revised_prompt,
      })) || [];
      console.log('[ChatGPT Service] Extracted images:', images);

      // Calculate credits used
      const creditsUsed = CREDIT_COSTS[quality];

      console.log('Image generation successful:', {
        count: images.length,
        creditsUsed,
        revisedPrompt: images[0]?.revised_prompt,
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
   * Generate multiple images by making multiple API calls
   * Since DALL-E 3 only supports n=1, we need to make multiple requests
   */
  async generateMultipleImages(
    options: ImageGenerationOptions,
    count: number = 1
  ): Promise<ImageGenerationResult> {
    try {
      if (count === 1) {
        return this.generateImage(options);
      }

      console.log(`Generating ${count} images with multiple API calls...`);
      
      const promises = Array(count).fill(null).map(() => 
        this.generateImage({ ...options, n: 1 })
      );

      const results = await Promise.all(promises);
      
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

}

// Export singleton instance
export const chatGPTService = new ChatGPTService();