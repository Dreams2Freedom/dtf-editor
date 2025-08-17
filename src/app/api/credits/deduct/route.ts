import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImageProcessingService } from '@/services/imageProcessing';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { credits, operation } = await request.json();

    if (!credits || credits < 1) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 }
      );
    }

    // Deduct credits using the service
    const imageProcessing = new ImageProcessingService();
    
    try {
      await imageProcessing.deductCredits(user.id, credits, operation || 'processing');
      
      // Get updated balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        credits_remaining: profile?.credits_remaining || 0
      });
      
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to deduct credits' },
        { status: 402 }
      );
    }

  } catch (error) {
    console.error('Credit deduction error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');