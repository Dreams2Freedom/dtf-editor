import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/admin-auth';

async function handlePost(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Limit to 100 IDs per request
    const ids = userIds.slice(0, 100);

    // Use service role client to bypass RLS
    const supabase = createServiceRoleClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', ids);

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // Return as a map of userId -> profile info for easy lookup
    const profileMap: Record<string, { email: string; name: string }> = {};
    for (const p of profiles || []) {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      profileMap[p.id] = {
        email: p.email || '',
        name,
      };
    }

    return NextResponse.json({ profiles: profileMap });
  } catch (error) {
    console.error('Admin profiles lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(handlePost);
