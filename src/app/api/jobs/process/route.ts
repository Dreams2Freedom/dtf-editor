import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ProcessingMode, DeepImageService } from '@/services/deepImage';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { ApiCostTracker } from '@/lib/api-cost-tracker';

// This endpoint processes a specific job synchronously
export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Get the job details
    const { data: job, error: jobError } = await serviceClient
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is already being processed or completed
    if (job.status !== 'pending') {
      return NextResponse.json({
        message: `Job already ${job.status}`,
        status: job.status,
      });
    }

    // Update job status to processing
    await serviceClient
      .from('processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10,
      })
      .eq('id', jobId);

    // Extract job parameters
    const {
      imageUrl,
      processingMode = 'auto_enhance',
      scale,
      targetWidth,
      targetHeight,
    } = job.input_data as any;

    // Process the image using DeepImageService
    const deepImageService = new DeepImageService();
    const startTime = Date.now();

    try {
      // Update progress to 30%
      await serviceClient
        .from('processing_jobs')
        .update({ progress: 30 })
        .eq('id', jobId);

      const response = await deepImageService.upscaleImage(imageUrl, {
        processingMode: processingMode as ProcessingMode,
        scale: scale as 2 | 4 | undefined,
        faceEnhance: false,
        targetWidth,
        targetHeight,
      });

      const processingTime = Date.now() - startTime;

      // Update progress to 70%
      await serviceClient
        .from('processing_jobs')
        .update({ progress: 70 })
        .eq('id', jobId);

      if (response.status === 'error' || !response.url) {
        throw new Error(response.error || 'Processing failed');
      }

      // Track API cost
      await ApiCostTracker.logUsage({
        userId: job.user_id,
        provider: 'deep_image',
        operation: 'upscale',
        status: 'success',
        creditsCharged: 1,
        processingTimeMs: processingTime,
        metadata: {
          targetWidth,
          targetHeight,
          processingMode,
        },
      });

      // Save to gallery
      let savedId = null;
      let finalUrl = response.url;

      if (response.url && !response.url.startsWith('data:')) {
        try {
          savedId = await saveProcessedImageToGallery({
            userId: job.user_id,
            processedUrl: response.url,
            operationType: 'upscale',
            originalFilename: `upscale_${Date.now()}.png`,
            metadata: {
              processingTime,
              creditsUsed: 1,
              processingTimeFromApi: response.processingTime,
            },
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
          console.error('[Job Process] Error saving to gallery:', saveError);
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
            processingTime,
            creditsUsed: 1,
          },
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json({
        success: true,
        url: finalUrl,
        imageId: savedId,
        processingTime,
      });
    } catch (error) {
      console.error('[Job Process] Processing error:', error);

      // Track failed API usage
      await ApiCostTracker.logUsage({
        userId: job.user_id,
        provider: 'deep_image',
        operation: 'upscale',
        status: 'failed',
        creditsCharged: 0,
        processingTimeMs: Date.now() - startTime,
        errorMessage:
          error instanceof Error ? error.message : 'Processing failed',
        metadata: {
          targetWidth,
          targetHeight,
          processingMode,
        },
      });

      // Update job as failed
      await serviceClient
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Processing failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Processing failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Job Process] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  const { data: job, error } = await serviceClient
    .from('processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}
