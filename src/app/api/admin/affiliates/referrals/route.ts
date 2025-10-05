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

    // Build time filter
    let timeCondition = '';
    const now = new Date();
    if (timeFilter === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeCondition = `r.created_at >= '${sevenDaysAgo.toISOString()}'`;
    } else if (timeFilter === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeCondition = `r.created_at >= '${thirtyDaysAgo.toISOString()}'`;
    } else if (timeFilter === 'quarter') {
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      timeCondition = `r.created_at >= '${quarterAgo.toISOString()}'`;
    } else if (timeFilter === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      timeCondition = `r.created_at >= '${yearAgo.toISOString()}'`;
    }

    // Use service role to fetch data
    const serviceClient = createServiceRoleClient();

    // Build query
    let query = `
      SELECT
        r.id,
        r.affiliate_id,
        r.referred_user_id,
        r.referral_code,
        r.status,
        r.subscription_plan as initial_plan,
        r.signed_up_at,
        r.first_payment_at,
        r.conversion_value,
        r.created_at,
        r.utm_source,
        r.utm_campaign,
        -- Affiliate info
        a.user_id as affiliate_user_id,
        affiliate_profile.email as affiliate_email,
        affiliate_profile.first_name as affiliate_first_name,
        affiliate_profile.last_name as affiliate_last_name,
        a.display_name as affiliate_display_name,
        -- Referred user info
        p.email as user_email,
        p.first_name as user_first_name,
        p.last_name as user_last_name,
        p.subscription_plan as current_plan,
        p.subscription_status as current_status,
        p.stripe_customer_id,
        p.total_credits_purchased,
        p.total_credits_used,
        p.created_at as user_created_at
      FROM referrals r
      LEFT JOIN affiliates a ON r.affiliate_id = a.id
      LEFT JOIN profiles affiliate_profile ON a.user_id = affiliate_profile.id
      LEFT JOIN profiles p ON r.referred_user_id = p.id
      WHERE 1=1
    `;

    // Add affiliate filter
    if (affiliateId) {
      query += ` AND r.affiliate_id = '${affiliateId}'`;
    }

    // Add time filter
    if (timeCondition) {
      query += ` AND ${timeCondition}`;
    }

    // Add plan filter based on CURRENT plan (not initial)
    if (planFilter !== 'all') {
      query += ` AND p.subscription_plan = '${planFilter}'`;
    }

    // Add sorting
    query += ` ORDER BY r.${sortBy} ${sortOrder.toUpperCase()}`;

    const { data: referrals, error } = await serviceClient.rpc('execute_sql', {
      query: query
    });

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
      console.error('[REFERRALS] Error fetching data:', referralsError);
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 });
    }

    // Get unique affiliate user IDs
    const affiliateUserIds = [...new Set(
      (referralsData || [])
        .map(r => r.affiliate?.user_id)
        .filter(Boolean)
    )];

    // Fetch affiliate user profiles
    let affiliateProfiles: any = {};
    if (affiliateUserIds.length > 0) {
      const { data: profiles } = await serviceClient
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', affiliateUserIds);

      if (profiles) {
        profiles.forEach(p => {
          affiliateProfiles[p.id] = p;
        });
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

  } catch (error) {
    console.error('[REFERRALS] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
