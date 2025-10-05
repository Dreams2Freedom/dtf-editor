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

    // Fetch all affiliates (bypasses RLS)
    const { data: affiliates, error: affiliatesError } = await serviceClient
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (affiliatesError) throw affiliatesError;

    // Fetch user profiles for affiliates
    const userIds = affiliates?.map(a => a.user_id).filter(Boolean) || [];

    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, first_name, last_name')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Map profiles to affiliates and construct full_name from first_name + last_name if needed
    const profilesMap = new Map(
      profiles?.map(p => [
        p.id,
        {
          ...p,
          full_name:
            p.full_name ||
            [p.first_name, p.last_name].filter(Boolean).join(' ') ||
            null,
        },
      ]) || []
    );

    const affiliatesWithProfiles =
      affiliates?.map(affiliate => ({
        ...affiliate,
        user: profilesMap.get(affiliate.user_id),
      })) || [];

    return NextResponse.json({ affiliates: affiliatesWithProfiles });
  } catch (error) {
    console.error('Error fetching affiliate applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
