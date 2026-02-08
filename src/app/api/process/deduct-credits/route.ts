import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { imageProcessingService } from '@/services/imageProcessing';
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
    // Check authentication
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

    // Get request body
    const body = await request.json();
    const { userId, creditsUsed, operation } = body;

    // Verify the user matches
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate and determine actual credit cost
    let actualCreditCost: number;

    if (operation && OPERATION_COSTS[operation]) {
      // Use server-side cost for known operations
      actualCreditCost = OPERATION_COSTS[operation];
    } else {
      // Validate client-provided cost
      if (typeof creditsUsed !== 'number' || !Number.isInteger(creditsUsed)) {
        return NextResponse.json(
          { error: 'Invalid credit amount: must be an integer' },
          { status: 400 }
        );
      }

      if (creditsUsed < 1 || creditsUsed > 5) {
        return NextResponse.json(
          { error: 'Invalid credit amount: must be between 1 and 5' },
          { status: 400 }
        );
      }

      actualCreditCost = creditsUsed;
    }

    // Deduct credits
    await imageProcessingService.deductCredits(userId, actualCreditCost, operation);

    // Log the processing record
    await imageProcessingService.logOperation(
      userId,
      operation,
      actualCreditCost,
      'success'
    );

    return NextResponse.json({
      success: true,
      message: 'Credits deducted successfully',
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
