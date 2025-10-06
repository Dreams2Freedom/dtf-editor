import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // First verify the request is from an authenticated admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Now use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Fetch all commissions
    const { data: commissions, error: commissionsError } = await serviceClient
      .from('commissions')
      .select(
        `
        *,
        affiliates!inner (
          referral_code,
          user_id
        ),
        referrals (
          referred_user_id,
          conversion_value
        )
      `
      )
      .order('created_at', { ascending: false });

    if (commissionsError) throw commissionsError;

    // Get all unique user IDs (affiliate users and referred users)
    const affiliateUserIds =
      commissions?.map(c => c.affiliates?.user_id).filter(Boolean) || [];
    const referredUserIds =
      commissions?.map(c => c.referrals?.referred_user_id).filter(Boolean) ||
      [];
    const allUserIds = [...new Set([...affiliateUserIds, ...referredUserIds])];

    // Fetch all user profiles in one query
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', allUserIds);

    if (profilesError) throw profilesError;

    // Map profiles by ID for easy lookup
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Enhance commissions with user data
    const commissionsWithUsers =
      commissions?.map(commission => {
        const affiliateProfile = profilesMap.get(
          commission.affiliates?.user_id
        );
        const referredProfile = commission.referrals?.referred_user_id
          ? profilesMap.get(commission.referrals.referred_user_id)
          : null;

        return {
          ...commission,
          affiliate: {
            ...commission.affiliates,
            user: affiliateProfile,
          },
          referral: commission.referrals
            ? {
                user_email: referredProfile?.email || 'Unknown',
                conversion_value: commission.referrals.conversion_value,
              }
            : null,
        };
      }) || [];

    return NextResponse.json({ commissions: commissionsWithUsers });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
