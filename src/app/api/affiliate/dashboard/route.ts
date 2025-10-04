/**
 * API Route: Get Affiliate Dashboard Data
 * GET /api/affiliate/dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAffiliateByUserId, getAffiliateDashboardStats } from '@/services/affiliate';

export async function GET(request: NextRequest) {
  try {
    // Validate session server-side
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get affiliate account (uses service role internally)
    const affiliate = await getAffiliateByUserId(user.id);

    if (!affiliate) {
      return NextResponse.json(
        { error: 'No affiliate account found' },
        { status: 404 }
      );
    }

    if (affiliate.status === 'pending') {
      return NextResponse.json({
        affiliate,
        status: 'pending',
        message: 'Your application is under review. We\'ll notify you within 24-48 hours.'
      });
    }

    if (affiliate.status === 'rejected') {
      return NextResponse.json({
        affiliate,
        status: 'rejected',
        message: affiliate.rejection_reason || 'Your application was not approved.'
      });
    }

    if (affiliate.status === 'suspended') {
      return NextResponse.json({
        affiliate,
        status: 'suspended',
        message: affiliate.suspended_reason || 'Your affiliate account has been suspended.'
      });
    }

    // Get dashboard stats (uses service role internally)
    const stats = await getAffiliateDashboardStats(affiliate.id);

    // Use service role to fetch affiliate's data (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    // Get recent referrals
    const { data: rawReferrals, error: referralsError } = await serviceClient
      .from('referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (referralsError) {
      console.error('[DASHBOARD API] Error fetching referrals:', referralsError);
    }

    // Get user profiles for referrals
    const userIds = rawReferrals?.map(r => r.referred_user_id).filter(Boolean) || [];
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, subscription_plan, subscription_status')
      .in('id', userIds);

    if (profilesError) {
      console.error('[DASHBOARD API] Error fetching profiles:', profilesError);
    }

    // Merge profiles with referrals
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const recentReferrals = rawReferrals?.map(ref => ({
      ...ref,
      referred_user: profilesMap.get(ref.referred_user_id) || null
    })) || [];

    // Get recent commissions
    const { data: recentCommissions } = await serviceClient
      .from('commissions')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get payout history
    const { data: payouts } = await serviceClient
      .from('payouts')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      affiliate,
      stats,
      recentReferrals,
      recentCommissions,
      payouts,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${affiliate.referral_code}`,
      status: 'approved'
    });

  } catch (error) {
    console.error('Error fetching affiliate dashboard:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}