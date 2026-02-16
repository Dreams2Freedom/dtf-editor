import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImageProcessingService } from '@/services/imageProcessing';
import { withRateLimit } from '@/lib/rate-limit';

// Server-side operation cost mapping
const OPERATION_COSTS: Record<string, number> = {
  'upscale': 1,
  'background-removal': 1,
  'vectorization': 1,
  'ai-generation': 2,
};

async function handlePost(request: NextRequest) {
  try {
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

    const { credits, operation } = await request.json();

    // Validate and determine actual credit cost
    let actualCreditCost: number;

    if (operation && OPERATION_COSTS[operation]) {
      // Use server-side cost for known operations
      actualCreditCost = OPERATION_COSTS[operation];
    } else {
      // Validate client-provided cost
      if (typeof credits !== 'number' || !Number.isInteger(credits)) {
        return NextResponse.json(
          { error: 'Invalid credit amount: must be an integer' },
          { status: 400 }
        );
      }

      if (credits < 1 || credits > 5) {
        return NextResponse.json(
          { error: 'Invalid credit amount: must be between 1 and 5' },
          { status: 400 }
        );
      }

      actualCreditCost = credits;
    }

    // Deduct credits using the service
    const imageProcessing = new ImageProcessingService();

    try {
      await imageProcessing.deductCredits(
        user.id,
        actualCreditCost,
        operation || 'processing'
      );

      // Get updated balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        credits_remaining: profile?.credits_remaining || 0,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : 'Failed to deduct credits',
        },
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
