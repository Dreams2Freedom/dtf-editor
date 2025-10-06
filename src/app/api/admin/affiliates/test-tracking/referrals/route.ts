import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get referral code from query
    const searchParams = request.nextUrl.searchParams;
    const referralCode = searchParams.get('code');

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code required' },
        { status: 400 }
      );
    }

    // Use service role to get data
    const serviceClient = createServiceRoleClient();

    // Get affiliate by code
    const { data: affiliate } = await serviceClient
      .from('affiliates')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    // Get referrals (all time)
    const { data: referrals } = await serviceClient
      .from('referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get profiles for referred users
    const userIds =
      referrals?.map(r => r.referred_user_id).filter(Boolean) || [];
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const referralsWithProfiles = referrals?.map(ref => ({
      ...ref,
      user_email: profilesMap.get(ref.referred_user_id)?.email || 'Unknown',
    }));

    return NextResponse.json({
      referrals: referralsWithProfiles || [],
      count: referrals?.length || 0,
      affiliateId: affiliate.id,
      referralCode,
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
