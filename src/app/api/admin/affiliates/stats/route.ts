import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // First verify the request is from an authenticated admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Now use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Fetch all affiliates (bypasses RLS)
    const { data: affiliates, error: affiliatesError } = await serviceClient
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (affiliatesError) throw affiliatesError;

    // Fetch recent referrals (bypasses RLS)
    const { data: referrals, error: referralsError } = await serviceClient
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (referralsError) throw referralsError;

    // Fetch commissions (bypasses RLS)
    const { data: commissions, error: commissionsError } = await serviceClient
      .from('commissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (commissionsError) throw commissionsError;

    // Fetch payouts (bypasses RLS)
    const { data: payouts, error: payoutsError } = await serviceClient
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (payoutsError) throw payoutsError;

    // Calculate stats
    const stats = {
      totalAffiliates: affiliates?.length || 0,
      activeAffiliates:
        affiliates?.filter(a => a.status === 'approved').length || 0,
      pendingApplications:
        affiliates?.filter(a => a.status === 'pending').length || 0,
      totalReferrals: referrals?.length || 0,
      totalCommissionsEarned:
        commissions?.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) ||
        0,
      pendingPayouts:
        commissions
          ?.filter(c => c.status === 'pending' || c.status === 'approved')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) || 0,
      affiliates,
      referrals,
      commissions,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
