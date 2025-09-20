import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET endpoint to check job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get job status (RLS will ensure user can only see their own jobs)
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Return job status
    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error_message,
        result: job.output_data,
        createdAt: job.created_at,
        completedAt: job.completed_at
      }
    });

  } catch (error) {
    console.error('[Job Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to cancel a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Update job status to cancelled
    const { error: updateError } = await supabase
      .from('processing_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .eq('status', 'pending'); // Can only cancel pending jobs

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled'
    });

  } catch (error) {
    console.error('[Job Cancel] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}