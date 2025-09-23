import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ProcessingMode } from '@/services/deepImage';
import { storageService } from '@/services/storage';

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

    // 5. Trigger job processing via separate endpoint
    // This avoids serverless timeout issues by making a separate request
    const baseUrl = request.url.split('/api')[0];

    // Make a non-blocking request to process the job
    fetch(`${baseUrl}/api/jobs/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId: job.id })
    }).catch(error => {
      console.error('[Upscale Async] Failed to trigger job processing:', error);
      // Update job status to failed if we can't even trigger it
      serviceClient
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to start processing',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
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