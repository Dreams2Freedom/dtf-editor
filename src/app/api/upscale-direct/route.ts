import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProcessingMode, DeepImageService } from '@/services/deepImage';
import { storageService } from '@/services/storage';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { ApiCostTracker } from '@/lib/api-cost-tracker';

// Maximum time we'll wait for processing (in ms)
const MAX_PROCESSING_TIME = 55000; // 55 seconds to stay under Vercel's 60s limit

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const imageUrl = formData.get('imageUrl') as string;
    const processingMode = (formData.get('processingMode') as ProcessingMode) || 'basic_upscale';
    const scale = formData.get('scale') ? parseInt(formData.get('scale') as string) : undefined;
    const targetWidth = formData.get('targetWidth') ? parseInt(formData.get('targetWidth') as string) : undefined;
    const targetHeight = formData.get('targetHeight') ? parseInt(formData.get('targetHeight') as string) : undefined;

    console.log('[Upscale Direct] Processing request:', {
      hasFile: !!imageFile,
      hasUrl: !!imageUrl,
      processingMode,
      targetWidth,
      targetHeight
    });

    // 3. Handle image input
    let finalImageUrl: string;

    if (imageFile) {
      // For large files, upload to storage first
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Check file size
      if (buffer.length > 4 * 1024 * 1024) { // 4MB limit for inline processing
        // Upload to Supabase storage for large files
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${imageFile.type};base64,${base64}`;

        const tempFileName = `temp_${Date.now()}_${imageFile.name}`;
        const uploadResult = await storageService.uploadImageFromDataUrl(
          dataUrl,
          tempFileName,
          user.id
        );

        finalImageUrl = uploadResult.url;
        console.log('[Upscale Direct] Large file uploaded to storage');
      } else {
        // For smaller files, convert to data URL
        const base64 = buffer.toString('base64');
        finalImageUrl = `data:${imageFile.type};base64,${base64}`;
        console.log('[Upscale Direct] Using data URL for small file');
      }
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
    } else {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // 4. Check if we should use simplified processing for large dimensions
    const megapixels = targetWidth && targetHeight ?
      (targetWidth * targetHeight) / 1000000 : 0;

    // For very large images, force basic upscale to avoid timeout
    if (megapixels > 15) {
      console.log(`[Upscale Direct] Large image (${megapixels}MP), using basic upscale`);
      processingMode === 'basic_upscale';
    }

    // 5. Process the image synchronously
    const deepImageService = new DeepImageService();

    try {
      console.log('[Upscale Direct] Starting Deep-Image processing');

      const response = await deepImageService.upscaleImage(finalImageUrl, {
        processingMode: processingMode as ProcessingMode,
        scale: scale as (2 | 4 | undefined),
        faceEnhance: false,
        targetWidth,
        targetHeight
      });

      const processingTime = Date.now() - startTime;
      console.log(`[Upscale Direct] Processing completed in ${processingTime}ms`);

      if (response.status === 'error' || !response.url) {
        // Track failed usage
        await ApiCostTracker.logUsage({
          userId: user.id,
          provider: 'deep_image',
          operation: 'upscale',
          status: 'failed',
          creditsCharged: 0,
          processingTimeMs: processingTime,
          errorMessage: response.error,
          metadata: { targetWidth, targetHeight, processingMode }
        });

        return NextResponse.json(
          {
            success: false,
            error: response.error || 'Processing failed'
          },
          { status: 400 }
        );
      }

      // 6. Track successful API usage
      await ApiCostTracker.logUsage({
        userId: user.id,
        provider: 'deep_image',
        operation: 'upscale',
        status: 'success',
        creditsCharged: 1,
        processingTimeMs: processingTime,
        metadata: { targetWidth, targetHeight, processingMode }
      });

      // 7. Save to gallery
      let savedId = null;
      let finalUrl = response.url;

      if (response.url && !response.url.startsWith('data:')) {
        try {
          savedId = await saveProcessedImageToGallery({
            userId: user.id,
            processedUrl: response.url,
            operationType: 'upscale',
            originalFilename: imageFile?.name || `upscale_${Date.now()}.png`,
            metadata: {
              processingTime,
              creditsUsed: 1,
              processingTimeFromApi: response.processingTime
            }
          });

          if (savedId) {
            // Get the permanent URL from storage
            const { data: imageData } = await supabase
              .from('processed_images')
              .select('storage_url')
              .eq('id', savedId)
              .single();

            if (imageData?.storage_url) {
              const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(imageData.storage_url);

              if (publicUrl) {
                finalUrl = publicUrl;
              }
            }
          }
        } catch (saveError) {
          console.error('[Upscale Direct] Error saving to gallery:', saveError);
        }
      }

      // 8. Check if we're approaching timeout
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        console.warn('[Upscale Direct] Approaching timeout, returning result quickly');
      }

      // 9. Return successful response
      return NextResponse.json({
        success: true,
        url: finalUrl,
        imageId: savedId,
        processingTime,
        creditsUsed: 1
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Track failed usage
      await ApiCostTracker.logUsage({
        userId: user.id,
        provider: 'deep_image',
        operation: 'upscale',
        status: 'failed',
        creditsCharged: 0,
        processingTimeMs: processingTime,
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
        metadata: { targetWidth, targetHeight, processingMode }
      });

      console.error('[Upscale Direct] Processing error:', error);

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Upscale Direct] Request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      },
      { status: 500 }
    );
  }
}

// Configure route segment to extend timeout (Vercel specific)
export const maxDuration = 60; // Maximum allowed for Pro plan