import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { ProcessingMode, DeepImageService } from '@/services/deepImage';
import { storageService } from '@/services/storage';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { ApiCostTracker } from '@/lib/api-cost-tracker';

// This endpoint starts an upscale job and returns immediately
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
    const processingMode =
      (formData.get('processingMode') as ProcessingMode) || 'auto_enhance';
    const scale = formData.get('scale')
      ? parseInt(formData.get('scale') as string)
      : undefined;
    const targetWidth = formData.get('targetWidth')
      ? parseInt(formData.get('targetWidth') as string)
      : undefined;
    const targetHeight = formData.get('targetHeight')
      ? parseInt(formData.get('targetHeight') as string)
      : undefined;

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
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
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
        originalFileName: imageFile?.name,
      },
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

    // 5. Process the job using Vercel's waitUntil to keep function alive
    // This allows background processing after response is sent
    const processPromise = processJob(job.id, user.id, finalImageUrl, {
      processingMode,
      scale,
      targetWidth,
      targetHeight,
    });

    // Use waitUntil to keep the function execution alive
    // This is Vercel's way of handling background tasks
    waitUntil(processPromise);

    // 6. Return job ID immediately
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Processing started. Poll for status updates.',
    });
  } catch (error) {
    console.error('[Upscale Async] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

// Process job asynchronously (runs after response is sent)
async function processJob(
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
  console.log(`[Upscale Async] Starting processing for job ${jobId}`);

  try {
    // Update job status to processing
    await serviceClient
      .from('processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10,
      })
      .eq('id', jobId);

    console.log(`[Upscale Async] Job ${jobId} marked as processing`);

    // Process the image using DeepImageService
    const deepImageService = new DeepImageService();
    const startTime = Date.now();

    // Update progress to 30%
    await serviceClient
      .from('processing_jobs')
      .update({ progress: 30 })
      .eq('id', jobId);

    console.log(`[Upscale Async] Job ${jobId} calling Deep-Image API`);

    const response = await deepImageService.upscaleImage(imageUrl, {
      processingMode: options.processingMode || 'auto_enhance',
      scale: options.scale as 2 | 4 | undefined,
      faceEnhance: false,
      targetWidth: options.targetWidth,
      targetHeight: options.targetHeight,
    });

    const processingTime = Date.now() - startTime;
    console.log(
      `[Upscale Async] Job ${jobId} Deep-Image response:`,
      response.status
    );

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
      userId,
      provider: 'deep_image',
      operation: 'upscale',
      status: 'success',
      creditsCharged: 1,
      processingTimeMs: processingTime,
      metadata: {
        targetWidth: options.targetWidth,
        targetHeight: options.targetHeight,
        processingMode: options.processingMode,
      },
    });

    // Save to gallery
    let savedId = null;
    let finalUrl = response.url;

    if (response.url && !response.url.startsWith('data:')) {
      try {
        savedId = await saveProcessedImageToGallery({
          userId,
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
          processingTime,
          creditsUsed: 1,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  } catch (error) {
    console.error('[Upscale Async] Processing failed:', error);

    // Track failed API usage
    await ApiCostTracker.logUsage({
      userId,
      provider: 'deep_image',
      operation: 'upscale',
      status: 'failed',
      creditsCharged: 0,
      processingTimeMs: Date.now() - Date.now(),
      errorMessage:
        error instanceof Error ? error.message : 'Processing failed',
      metadata: {
        targetWidth: options.targetWidth,
        targetHeight: options.targetHeight,
        processingMode: options.processingMode,
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
  }
}
