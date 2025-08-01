import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user's credit summary from the view
    const { data: summary, error: summaryError } = await supabase
      .from('user_credit_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      throw summaryError;
    }

    // Get credits expiring in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringPurchases, error: expiringError } = await supabase
      .from('credit_purchases')
      .select('credits_remaining, expires_at')
      .eq('user_id', user.id)
      .gt('credits_remaining', 0)
      .lte('expires_at', thirtyDaysFromNow.toISOString())
      .order('expires_at', { ascending: true });

    if (expiringError) {
      console.error('Error fetching expiring credits:', expiringError);
    }

    // Calculate expiring credits count
    const expiring_soon_count = expiringPurchases?.reduce(
      (sum, purchase) => sum + purchase.credits_remaining, 
      0
    ) || 0;

    // Get the nearest expiration date
    const next_expiration_date = expiringPurchases?.[0]?.expires_at || null;

    return NextResponse.json({
      success: true,
      data: {
        total_credits: summary?.total_credits || 0,
        active_credits: summary?.active_credits || 0,
        rollover_credits: summary?.rollover_credits || 0,
        next_expiration_date,
        expiring_soon_count
      }
    });

  } catch (error) {
    console.error('Credit summary error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch credit summary' 
    }, { status: 500 });
  }
}