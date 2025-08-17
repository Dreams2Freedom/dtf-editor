import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get credits that will expire in the next 14 days
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

    // TODO: Create RPC for expiring credits
    // For now, return empty array
    const expiringCredits: any[] = [];
    const error = null;

    if (error) {
      console.error('Error fetching expiring credits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expiring credits' },
        { status: 500 }
      );
    }

    // Transform the data to include days until expiration
    const transformedCredits = (expiringCredits || []).map(credit => {
      const expiresAt = new Date(credit.expires_at);
      const now = new Date();
      const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        credits: credit.amount,
        expiresAt: credit.expires_at,
        daysUntilExpiration: Math.max(0, daysUntilExpiration)
      };
    });

    // Also check if user is on free plan with low credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, credits_remaining')
      .eq('id', user.id)
      .single();

    const lowCreditWarning = profile?.subscription_plan === 'free' && 
                           profile?.credits_remaining <= 1;

    return NextResponse.json({
      expiringCredits: transformedCredits,
      lowCreditWarning,
      totalExpiring: transformedCredits.reduce((sum, c) => sum + c.credits, 0)
    });

  } catch (error) {
    console.error('Error checking expiring credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');