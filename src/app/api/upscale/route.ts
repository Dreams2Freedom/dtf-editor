import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { imageProcessingService } from '@/services/imageProcessing';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProcessingMode } from '@/services/deepImage';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';

export async function POST(request: NextRequest) {
  try {
    // 1. Get current user using server-side Supabase client
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
    const processingMode = (formData.get('processingMode') as ProcessingMode) || 'auto_enhance';
    const scale = parseInt(formData.get('scale') as string) || 4;

    let finalImageUrl: string;

    // 3. Handle file upload if provided
    if (imageFile) {
      // Upload image to Supabase Storage
      const uploadResult = await storageService.uploadFile(imageFile);
      
      if (!uploadResult.success || !uploadResult.url) {
        return NextResponse.json(
          { error: uploadResult.error || 'Failed to upload image' },
          { status: 500 }
        );
      }

      finalImageUrl = uploadResult.url;
    } else if (imageUrl) {
      // Use the provided image URL directly
      finalImageUrl = imageUrl;
    } else {
      return NextResponse.json({ error: 'No image file or URL provided' }, { status: 400 });
    }

    // 4. Process image using centralized service
    const result = await imageProcessingService.processImage(
      user.id,
      finalImageUrl,
      {
        operation: 'upscale',
        scale: scale as 2 | 4,
        processingMode,
        faceEnhance: false
      }
    );

    // 5. Return result
    if (result.success) {
      // Save to gallery
      if (result.processedUrl) {
        try {
          console.log('[Upscale] Attempting to save to gallery...');
          const savedId = await saveProcessedImageToGallery({
            userId: user.id,
            processedUrl: result.processedUrl,
            operationType: 'upscale',
            originalFilename: imageFile?.name || 'upscaled_image',
            metadata: {
              scale,
              processingMode,
              creditsUsed: result.metadata?.creditsUsed || 1,
              processingTime: result.metadata?.processingTime
            }
          });
          console.log('[Upscale] Save result:', savedId ? 'Success' : 'Failed');
        } catch (saveError) {
          console.error('[Upscale] Error saving to gallery:', saveError);
          // Don't fail the request if saving fails
        }
      }
      
      return NextResponse.json({
        success: true,
        url: result.processedUrl,
        processingTime: result.metadata?.processingTime,
        creditsUsed: result.metadata?.creditsUsed
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Upscaling failed' },
        { status: 422 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upscaling failed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 