import { env, isFeatureAvailable } from '@/config/env';
import { DeepImageService } from './deepImage';
import { ClippingMagicService } from './clippingMagic';
import { VectorizerService } from './vectorizer';
import { createClient } from '@supabase/supabase-js';
import { ApiCostTracker } from '@/lib/api-cost-tracker';

// Types for image processing operations
export type ProcessingOperation = 'upscale' | 'background-removal' | 'vectorization' | 'ai-generation';

export interface ProcessingOptions {
  operation: ProcessingOperation;
  // Upscaling options
  scale?: 2 | 4;
  processingMode?: 'auto_enhance' | 'generative_upscale' | 'basic_upscale';
  faceEnhance?: boolean;
  targetWidth?: number;  // For DPI-aware upscaling
  targetHeight?: number; // For DPI-aware upscaling
  // Background removal options
  backgroundColor?: string;
  // Vectorization options
  vectorFormat?: 'svg' | 'pdf';
  // AI generation options
  prompt?: string;
  style?: string;
}

export interface ProcessingResult {
  success: boolean;
  operation: ProcessingOperation;
  originalUrl: string;
  processedUrl?: string;
  metadata?: {
    processingTime?: number;
    fileSize?: number;
    dimensions?: { width: number; height: number };
    creditsUsed: number;
  };
  error?: string;
}

export interface ProcessingJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  operation: ProcessingOperation;
  options: ProcessingOptions;
  originalImageUrl: string;
  processedImageUrl?: string;
  creditsUsed: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ImageProcessingService {
  private deepImageService: DeepImageService;
  private clippingMagicService: ClippingMagicService;
  private vectorizerService: VectorizerService;
  private supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  constructor() {
    this.deepImageService = new DeepImageService();
    this.clippingMagicService = new ClippingMagicService();
    this.vectorizerService = new VectorizerService();
  }

  /**
   * Map processing operation to API provider and operation
   */
  private mapOperationToProvider(operation: ProcessingOperation): { provider: 'deep_image' | 'clipping_magic' | 'vectorizer' | 'openai'; apiOperation: 'upscale' | 'background_removal' | 'vectorization' | 'image_generation' } {
    switch (operation) {
      case 'upscale':
        return { provider: 'deep_image', apiOperation: 'upscale' };
      case 'background-removal':
        return { provider: 'clipping_magic', apiOperation: 'background_removal' };
      case 'vectorization':
        return { provider: 'vectorizer', apiOperation: 'vectorization' };
      case 'ai-generation':
        return { provider: 'openai', apiOperation: 'image_generation' };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Process an image with the specified operation and options
   */
  async processImage(
    userId: string,
    imageUrl: string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    let isAdmin = false; // Declare at function scope

    try {
      // 1. Check if the feature is available
      if (!this.isOperationAvailable(options.operation)) {
        throw new Error(`${options.operation} is not available - missing API configuration`);
      }

      // Check if user is admin
      const { data: adminProfile } = await this.supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      isAdmin = adminProfile?.is_admin === true;

      // 2. Check user credits before processing (skip for admins)
      const requiredCredits = this.getOperationCost(options.operation);
      if (!isAdmin) {
        const hasCredits = await this.checkUserCredits(userId, requiredCredits);
        if (!hasCredits) {
          throw new Error('Insufficient credits for this operation');
        }

        // 3. Deduct credits before processing (skip for admins)
        await this.deductCredits(userId, requiredCredits, options.operation);
      }

      // 4. Process the image based on operation type
      let processedUrl: string;
      
      switch (options.operation) {
        case 'upscale':
          processedUrl = await this.handleUpscaling(imageUrl, options);
          break;
        
        case 'background-removal':
          processedUrl = await this.handleBackgroundRemoval(imageUrl, options);
          break;
          
        case 'vectorization':
          processedUrl = await this.handleVectorization(imageUrl, options);
          break;
          
        case 'ai-generation':
          processedUrl = await this.handleAIGeneration(options);
          break;
          
        default:
          throw new Error(`Unsupported operation: ${options.operation}`);
      }

      // 5. Save processing result to database (0 credits for admins)
      await this.saveProcessingResult(userId, {
        operation: options.operation,
        originalUrl: imageUrl,
        processedUrl,
        creditsUsed: isAdmin ? 0 : requiredCredits,
        processingTime: Date.now() - startTime
      });

      // 6. Get user plan for cost tracking
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();
      
      const userPlan = profile?.subscription_plan || 'free';
      const processingTime = Date.now() - startTime;

      // 7. Track API costs (0 credits for admins)
      const { provider, apiOperation } = this.mapOperationToProvider(options.operation);
      await ApiCostTracker.logUsage({
        userId,
        provider,
        operation: apiOperation,
        status: 'success',
        creditsCharged: isAdmin ? 0 : requiredCredits,
        userPlan,
        processingTimeMs: processingTime,
        metadata: { imageUrl, processedUrl }
      });

      // 8. Log successful operation (0 credits for admins)
      await this.logOperation(userId, options.operation, isAdmin ? 0 : requiredCredits, 'success', processingTime);

      return {
        success: true,
        operation: options.operation,
        originalUrl: imageUrl,
        processedUrl,
        metadata: {
          processingTime: Date.now() - startTime,
          creditsUsed: requiredCredits
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      // Only refund credits if the error is NOT due to insufficient credits (skip for admins)
      if (!errorMessage.toLowerCase().includes('insufficient credits') && !isAdmin) {
        const requiredCredits = this.getOperationCost(options.operation);
        await this.refundCredits(userId, requiredCredits, options.operation);
      }
      
      // Get user plan for cost tracking
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();
      
      const userPlan = profile?.subscription_plan || 'free';
      const processingTime = Date.now() - startTime;

      // Track failed API usage (still costs us even if it fails)
      const { provider, apiOperation } = this.mapOperationToProvider(options.operation);
      await ApiCostTracker.logUsage({
        userId,
        provider,
        operation: apiOperation,
        status: 'failed',
        creditsCharged: 0, // No credits charged on failure
        userPlan,
        processingTimeMs: processingTime,
        errorMessage,
        metadata: { imageUrl }
      });
      
      await this.logOperation(userId, options.operation, 0, 'failed', processingTime);

      return {
        success: false,
        operation: options.operation,
        originalUrl: imageUrl,
        error: errorMessage,
        metadata: {
          processingTime: Date.now() - startTime,
          creditsUsed: 0
        }
      };
    }
  }

  /**
   * Handle image upscaling using Deep-Image.ai
   */
  private async handleUpscaling(imageUrl: string, options: ProcessingOptions): Promise<string> {
    // Check if we have target dimensions (DPI mode) or scale factor (simple mode)
    if (!options.targetWidth && !options.targetHeight && !options.scale) {
      throw new Error('Either target dimensions or scale factor is required for upscaling');
    }
    
    if (!options.processingMode) {
      throw new Error('Processing mode is required for upscaling');
    }

    const result = await this.deepImageService.upscaleImage(imageUrl, {
      scale: options.scale,
      processingMode: options.processingMode,
      faceEnhance: options.faceEnhance,
      targetWidth: options.targetWidth,
      targetHeight: options.targetHeight,
      type: 'photo' // Default to photo for now
    });

    if (result.status === 'error') {
      throw new Error(result.error || 'Upscaling failed');
    }

    if (!result.url) {
      throw new Error('No processed image URL returned from upscaling service');
    }

    return result.url;
  }

  /**
   * Handle background removal using ClippingMagic
   */
  private async handleBackgroundRemoval(imageUrl: string, options: ProcessingOptions): Promise<string> {
    const result = await this.clippingMagicService.removeBackground(imageUrl, {
      format: 'png', // Default to PNG for transparency
      backgroundColor: options.backgroundColor,
      transparent: true
    });

    if (result.status === 'error') {
      throw new Error(result.error || 'Background removal failed');
    }

    if (!result.url) {
      throw new Error('No processed image URL returned from background removal service');
    }

    return result.url;
  }

  /**
   * Handle vectorization using Vectorizer.ai
   */
  private async handleVectorization(imageUrl: string, options: ProcessingOptions): Promise<string> {
    const result = await this.vectorizerService.vectorizeImage(imageUrl, {
      format: options.vectorFormat || 'svg',
      mode: 'production',
      processing_options: {
        curve_fitting: 'medium', // Good balance of quality and speed
        corner_threshold: 120,
        length_threshold: 2.0,
        max_iterations: 100
      }
    });

    if (result.status === 'error') {
      throw new Error(result.error || 'Vectorization failed');
    }

    if (!result.url) {
      throw new Error('No processed vector URL returned from vectorization service');
    }

    return result.url;
  }

  /**
   * Handle AI image generation (placeholder for OpenAI integration)
   */
  private async handleAIGeneration(options: ProcessingOptions): Promise<string> {
    // TODO: Implement OpenAI integration in Phase 2
    if (!options.prompt) {
      throw new Error('Prompt is required for AI image generation');
    }
    throw new Error('AI image generation is not yet implemented');
  }

  /**
   * Check if a processing operation is available based on environment configuration
   */
  private isOperationAvailable(operation: ProcessingOperation): boolean {
    switch (operation) {
      case 'upscale':
        return isFeatureAvailable('upscaling');
      case 'background-removal':
        return isFeatureAvailable('background-removal');
      case 'vectorization':
        return isFeatureAvailable('vectorization');
      case 'ai-generation':
        return isFeatureAvailable('ai-generation');
      default:
        return false;
    }
  }

  /**
   * Get the credit cost for an operation
   */
  private getOperationCost(operation: ProcessingOperation): number {
    switch (operation) {
      case 'upscale':
        return 1;
      case 'background-removal':
        return 1;
      case 'vectorization':
        return 2;
      case 'ai-generation':
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  private async checkUserCredits(userId: string, requiredCredits: number): Promise<boolean> {
    try {
      // Only select credits_remaining since credits column doesn't exist
      const { data, error } = await this.supabase
        .from('profiles')
        .select('credits_remaining, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user credits:', error);
        throw error;
      }
      
      // Use credits_remaining
      const availableCredits = data?.credits_remaining ?? 0;
      
      console.log('Credit check:', {
        userId,
        requiredCredits,
        availableCredits,
        data,
        hasEnough: availableCredits >= requiredCredits
      });
      
      return availableCredits >= requiredCredits;
    } catch (error) {
      console.error('Error checking user credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(userId: string, credits: number, operation: string): Promise<void> {
    // Try the new function name first, fall back to direct update if it fails
    try {
      const { data, error } = await this.supabase.rpc('deduct_credits', {
        user_id: userId,
        credits: credits,
        operation: operation
      });

      if (!error && data?.success) {
        return; // Success with new function
      }
    } catch (e) {
      // Function might not exist, continue to fallback
    }

    // Fallback: Direct database update
    const { data: profile, error: fetchError } = await this.supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      throw new Error('Failed to fetch user credits');
    }

    // Use credits_remaining
    const availableCredits = profile.credits_remaining ?? 0;
    if (availableCredits < credits) {
      throw new Error('Insufficient credits');
    }

    // Update credits_remaining
    const updateData = { 
      credits_remaining: availableCredits - credits, 
      updated_at: new Date().toISOString() 
    };

    const { error: updateError } = await this.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    // Log transaction
    await this.supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -credits,
        type: 'usage',
        description: `Used for ${operation}`,
        metadata: { operation },
        balance_after: profile.credits_remaining - credits
      });
  }

  /**
   * Refund credits to user account (on processing failure)
   */
  private async refundCredits(userId: string, credits: number, operation: string): Promise<void> {
    try {
      // Try the new function first
      const { error } = await this.supabase.rpc('refund_credits', {
        user_id: userId,
        credits: credits,
        reason: `Refund for failed ${operation}`
      });

      if (!error) {
        return; // Success
      }
    } catch (e) {
      // Continue to fallback
    }

    // Fallback: Direct database update
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single();

      if (profile) {
        await this.supabase
          .from('profiles')
          .update({ 
            credits_remaining: profile.credits_remaining + credits,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        // Log transaction
        await this.supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: credits,
            type: 'refund',
            description: `Refund for failed ${operation}`,
            metadata: { operation, refund_reason: 'processing_failed' },
            balance_after: profile.credits_remaining + credits
          });
      }
    } catch (error) {
      // Don't throw errors for refund failures
    }
  }


  /**
   * Save processing result to database
   */
  private async saveProcessingResult(userId: string, result: {
    operation: string;
    originalUrl: string;
    processedUrl: string;
    creditsUsed: number;
    processingTime: number;
  }): Promise<void> {
    try {
      console.log('Saving processing result:', {
        userId,
        operation: result.operation,
        processedUrl: result.processedUrl
      });
      
      // Extract filename from URL
      const originalFilename = result.originalUrl.split('/').pop() || 'processed_image';
      const processedFilename = `${originalFilename.split('.')[0]}_${result.operation}_${Date.now()}.${originalFilename.split('.').pop()}`;
      
      // Get image dimensions if available (this is a placeholder - actual implementation would fetch from processed image)
      const dimensions = { width: null, height: null };
      
      // Calculate expiration date based on user's plan
      const { data: expirationData, error: expirationError } = await this.supabase
        .rpc('calculate_image_expiration', { p_user_id: userId });
        
      if (expirationError) {
        console.error('Error calculating expiration:', expirationError);
      }
      
      // Image saving is disabled here to prevent duplicates
      // The API endpoints (upscale/route.ts, process/route.ts) handle the saving
      // by downloading the image and re-uploading to Supabase storage
      
      console.log('Image processing completed. Gallery saving handled by API endpoint.');
    } catch (error) {
      // Log error but don't throw - we don't want to fail the entire operation
      console.error('Failed to save to image gallery:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  }
  
  /**
   * Get API provider name for operation
   */
  private getApiProviderForOperation(operation: string): string {
    switch (operation) {
      case 'upscale':
        return 'Deep-Image.ai';
      case 'background-removal':
        return 'ClippingMagic';
      case 'vectorization':
        return 'Vectorizer.ai';
      case 'ai-generation':
        return 'OpenAI DALL-E';
      default:
        return 'Unknown';
    }
  }

  /**
   * Log operation for analytics
   */
  async logOperation(
    userId: string,
    operation: string,
    creditsUsed: number,
    status: 'success' | 'failed',
    processingTimeMs?: number
  ): Promise<void> {
    try {
      await this.supabase.from('user_activity_logs').insert({
        user_id: userId,
        activity_type: `image_${operation}`,
        activity_data: {
          operation,
          creditsUsed,
          status,
          processingTimeMs
        },
        created_at: new Date().toISOString()
      });
    } catch (error) {
      // Don't throw errors for logging failures
    }
  }

  /**
   * Get user's processing history
   */
  async getProcessingHistory(userId: string, limit = 20): Promise<ProcessingJob[]> {
    try {
      const { data, error } = await this.supabase
        .from('processed_images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        status: row.processing_status,
        operation: this.mapOperationTypeToOperation(row.operation_type),
        options: {
          operation: this.mapOperationTypeToOperation(row.operation_type)
        },
        originalImageUrl: row.metadata?.original_url || row.storage_url,
        processedImageUrl: row.storage_url,
        creditsUsed: row.metadata?.credits_used || 0,
        error: row.processing_status === 'failed' ? 'Processing failed' : undefined,
        createdAt: new Date(row.created_at),
        completedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }));
    } catch (error) {
      console.error('Error fetching processing history:', error);
      return [];
    }
  }
  
  /**
   * Map database operation_type to ProcessingOperation
   */
  private mapOperationTypeToOperation(operationType: string): ProcessingOperation {
    switch (operationType) {
      case 'upscale':
        return 'upscale';
      case 'background-removal':
        return 'background-removal';
      case 'vectorize':
        return 'vectorization';
      case 'generate':
        return 'ai-generation';
      default:
        return 'upscale';
    }
  }

  /**
   * Get available operations for a user (based on feature availability)
   */
  getAvailableOperations(): ProcessingOperation[] {
    const operations: ProcessingOperation[] = [];
    
    if (isFeatureAvailable('upscaling')) operations.push('upscale');
    if (isFeatureAvailable('background-removal')) operations.push('background-removal');
    if (isFeatureAvailable('vectorization')) operations.push('vectorization');
    if (isFeatureAvailable('ai-generation')) operations.push('ai-generation');
    
    return operations;
  }


}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();