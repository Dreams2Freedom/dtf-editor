import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    const { data: expiringCredits, error } = await supabase
      .from('credit_transactions')
      .select('amount, expires_at')
      .eq('user_id', user.id)
      .eq('operation', 'purchase')
      .not('expires_at', 'is', null)
      .lte('expires_at', fourteenDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString())
      .gt('amount', 0)
      .order('expires_at', { ascending: true });

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