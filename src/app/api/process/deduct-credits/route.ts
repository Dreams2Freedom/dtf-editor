import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { imageProcessingService } from '@/services/imageProcessing';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, creditsUsed, operation } = body;

    // Verify the user matches
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Deduct credits
    await imageProcessingService.deductCredits(userId, creditsUsed, operation);

    // Log the processing record
    await imageProcessingService.logOperation(
      userId,
      operation,
      creditsUsed,
      'success'
    );

    return NextResponse.json({ 
      success: true,
      message: 'Credits deducted successfully' 
    });

  } catch (error) {
    console.error('Credit deduction error:', error);
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'processing');