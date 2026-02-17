import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin using simplified auth
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

    // Use service role client to get all users
    let serviceClient;
    try {
      serviceClient = createServiceRoleSupabaseClient();
    } catch (error) {
      console.error(
        'Failed to create service role client in user stats route:',
        error
      );
      return NextResponse.json(
        {
          error: 'Database configuration error',
        },
        { status: 500 }
      );
    }

    // Get all users to calculate statistics
    const { data: allUsers, error: usersError } = await serviceClient
      .from('profiles')
      .select('is_active, subscription_plan');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Calculate statistics from the fetched data
    const totalUsers = allUsers?.length || 0;
    const activeUsers =
      allUsers?.filter(user => user.is_active !== false).length || 0;
    const paidUsers =
      allUsers?.filter(
        user =>
          user.subscription_plan &&
          ['basic', 'starter', 'professional', 'pro'].includes(
            user.subscription_plan.toLowerCase()
          )
      ).length || 0;
    const suspendedUsers =
      allUsers?.filter(user => user.is_active === false).length || 0;

    // Debug logging
    console.log('User stats calculation:', {
      totalData: allUsers?.length,
      activeCount: activeUsers,
      paidCount: paidUsers,
      suspendedCount: suspendedUsers,
      sampleData: allUsers?.slice(0, 3).map(u => ({
        is_active: u.is_active,
        subscription_plan: u.subscription_plan,
      })),
    });

    return NextResponse.json({
      total: totalUsers,
      active: activeUsers,
      paid: paidUsers,
      suspended: suspendedUsers,
    });
  } catch (error) {
    console.error('Admin user stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
