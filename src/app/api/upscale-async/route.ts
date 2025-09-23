import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ProcessingMode } from '@/services/deepImage';
import { storageService } from '@/services/storage';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';

// Import imageProcessingService directly to avoid bundling issues
const getImageProcessingService = () => {
  const { imageProcessingService } = require('@/services/imageProcessing');
  return imageProcessingService;
};

// This endpoint starts an upscale job and returns immediately
export async function POST(request: NextRequest) {
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
    const processingMode = (formData.get('processingMode') as ProcessingMode) || 'auto_enhance';
    const scale = formData.get('scale') ? parseInt(formData.get('scale') as string) : undefined;
    const targetWidth = formData.get('targetWidth') ? parseInt(formData.get('targetWidth') as string) : undefined;
    const targetHeight = formData.get('targetHeight') ? parseInt(formData.get('targetHeight') as string) : undefined;

    // 3. Store image temporarily if uploaded
    let finalImageUrl: string;

    if (imageFile) {
      // Upload to temporary storage
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${imageFile.type};base64,${base64}`;

      // Store temporarily (will be deleted after processing)
      const tempFileName = `temp_${Date.now()}_${imageFile.name}`;
      const uploadResult = await storageService.uploadImageFromDataUrl(
        dataUrl,
        tempFileName,
        user.id
      );

      finalImageUrl = uploadResult.url;
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
    } else {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // 4. Create job in database
    const serviceClient = createServiceRoleClient();
    const jobData = {
      user_id: user.id,
      job_type: 'upscale',
      status: 'pending',
      progress: 0,
      input_data: {
        imageUrl: finalImageUrl,
        processingMode,
        scale,
        targetWidth,
        targetHeight,
        originalFileName: imageFile?.name
      }
    };

    const { data: job, error: jobError } = await serviceClient
      .from('processing_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create processing job' },
        { status: 500 }
      );
    }

    // 5. Start processing asynchronously (non-blocking)
    processUpscaleJob(job.id, user.id, finalImageUrl, {
      processingMode,
      scale,
      targetWidth,
      targetHeight
    }).catch(error => {
      console.error('[Upscale Async] Processing error:', error);
      // Update job status to failed
      serviceClient
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .then(() => console.log('Job marked as failed'));
    });

    // 6. Return job ID immediately
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Processing started. Poll for status updates.'
    });

  } catch (error) {
    console.error('[Upscale Async] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

// Background processing function (runs asynchronously)
async function processUpscaleJob(
  jobId: string,
  userId: string,
  imageUrl: string,
  options: {
    processingMode: ProcessingMode;
    scale?: number;
    targetWidth?: number;
    targetHeight?: number;
  }
) {
  const serviceClient = createServiceRoleClient();

  try {
    // Update job status to processing
    await serviceClient
      .from('processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('id', jobId);

    // Process the image
    const imageService = getImageProcessingService();
    const result = await imageService.upscaleImage(
      imageUrl,
      userId,
      options.processingMode,
      options.scale,
      options.targetWidth,
      options.targetHeight
    );

    // Update progress
    await serviceClient
      .from('processing_jobs')
      .update({ progress: 50 })
      .eq('id', jobId);

    if (!result.success || !result.processedUrl) {
      throw new Error(result.error || 'Processing failed');
    }

    // Save to gallery if successful
    let savedId = null;
    let finalUrl = result.processedUrl;

    if (result.processedUrl && !result.processedUrl.startsWith('data:')) {
      try {
        savedId = await saveProcessedImageToGallery({
          userId,
          processedUrl: result.processedUrl,
          operationType: 'upscale',
          originalFilename: `upscale_${Date.now()}.png`,
          metadata: result.metadata || {}
        });

        if (savedId) {
          // Get the saved image URL
          const { data: imageData } = await serviceClient
            .from('processed_images')
            .select('storage_url')
            .eq('id', savedId)
            .single();

          if (imageData?.storage_url) {
            const { data: urlData } = serviceClient.storage
              .from('images')
              .getPublicUrl(imageData.storage_url);

            if (urlData?.publicUrl) {
              finalUrl = urlData.publicUrl;
            }
          }
        }
      } catch (saveError) {
        console.error('[Upscale Async] Error saving to gallery:', saveError);
      }
    }

    // Update job as completed
    await serviceClient
      .from('processing_jobs')
      .update({
        status: 'completed',
        progress: 100,
        output_data: {
          url: finalUrl,
          imageId: savedId,
          processingTime: result.metadata?.processingTime,
          creditsUsed: result.metadata?.creditsUsed
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

  } catch (error) {
    console.error('[Upscale Async] Processing failed:', error);

    // Update job as failed
    await serviceClient
      .from('processing_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    throw error;
  }
}