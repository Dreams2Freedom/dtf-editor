/**
 * API Route: Get Affiliate Referrals (Admin Only)
 * GET /api/admin/affiliates/referrals
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const planFilter = searchParams.get('plan') || 'all'; // all, free, basic, starter, professional
    const timeFilter = searchParams.get('time') || 'all'; // all, 7days, 30days, quarter, year
    const affiliateId = searchParams.get('affiliate_id'); // optional filter by specific affiliate
    const sortBy = searchParams.get('sort') || 'created_at'; // created_at, conversion_value
    const sortOrder = searchParams.get('order') || 'desc'; // asc, desc

    // Use service role to fetch data
    const serviceClient = createServiceRoleClient();

    // Use direct query with proper foreign key syntax
    const { data: referralsData, error: referralsError } = await serviceClient
      .from('referrals')
      .select(`
        *,
        affiliate:affiliates (
          id,
          user_id,
          display_name,
          referral_code
        ),
        referred_user:profiles!referrals_referred_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          subscription_plan,
          subscription_status,
          stripe_customer_id,
          total_credits_purchased,
          total_credits_used,
          created_at
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    if (referralsError) {
      console.error('[REFERRALS] Error fetching data:', JSON.stringify(referralsError, null, 2));
      return NextResponse.json({
        error: 'Failed to fetch referrals',
        details: referralsError.message || 'Unknown error'
      }, { status: 500 });
    }

    console.log('[REFERRALS] Successfully fetched', (referralsData || []).length, 'referrals');

    try {
      // Get unique affiliate user IDs
      const affiliateUserIds = [...new Set(
        (referralsData || [])
          .map(r => r.affiliate?.user_id)
          .filter(Boolean)
      )];

      console.log('[REFERRALS] Found', affiliateUserIds.length, 'unique affiliate users');

      // Fetch affiliate user profiles
      let affiliateProfiles: any = {};
      if (affiliateUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await serviceClient
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', affiliateUserIds);

        if (profilesError) {
          console.error('[REFERRALS] Error fetching profiles:', profilesError);
        } else if (profiles) {
          profiles.forEach(p => {
            affiliateProfiles[p.id] = p;
          });
          console.log('[REFERRALS] Fetched', profiles.length, 'affiliate profiles');
        }
      }

      // Merge affiliate user data
      const mergedData = (referralsData || []).map(r => ({
        ...r,
        affiliate: r.affiliate ? {
          ...r.affiliate,
          affiliate_user: affiliateProfiles[r.affiliate.user_id] || null
        } : null
      }));

      console.log('[REFERRALS] Merged data, total:', mergedData.length);

      // Apply filters in JavaScript since Supabase query might not support all filters
      let filteredData = mergedData;

      // Filter by affiliate
      if (affiliateId) {
        filteredData = filteredData.filter(r => r.affiliate_id === affiliateId);
      }

      // Filter by time
      if (timeFilter !== 'all') {
        const now = new Date();
        let cutoffDate: Date;

        if (timeFilter === '7days') {
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeFilter === '30days') {
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeFilter === 'quarter') {
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else { // year
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        }

        filteredData = filteredData.filter(r => new Date(r.created_at) >= cutoffDate);
      }

      // Filter by plan
      if (planFilter !== 'all') {
        filteredData = filteredData.filter(r =>
          r.referred_user?.subscription_plan === planFilter
        );
      }

      // Calculate summary stats
      const stats = {
        total_referrals: filteredData.length,
        free_accounts: filteredData.filter(r => r.referred_user?.subscription_plan === 'free').length,
        basic_accounts: filteredData.filter(r => r.referred_user?.subscription_plan === 'basic').length,
        starter_accounts: filteredData.filter(r => r.referred_user?.subscription_plan === 'starter').length,
        professional_accounts: filteredData.filter(r => r.referred_user?.subscription_plan === 'professional').length,
        total_conversions: filteredData.filter(r => r.first_payment_at).length,
        total_conversion_value: filteredData.reduce((sum, r) => sum + (parseFloat(r.conversion_value as string) || 0), 0),
        conversion_rate: filteredData.length > 0
          ? (filteredData.filter(r => r.first_payment_at).length / filteredData.length * 100).toFixed(1)
          : '0.0'
      };

      console.log('[REFERRALS] Returning', filteredData.length, 'filtered referrals with stats');

      return NextResponse.json({
        referrals: filteredData,
        stats,
        filters: {
          plan: planFilter,
          time: timeFilter,
          affiliate_id: affiliateId,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      });

    } catch (processingError: any) {
      console.error('[REFERRALS] Error processing data:', processingError);
      return NextResponse.json({
        error: 'Failed to process referrals data',
        details: processingError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[REFERRALS] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
