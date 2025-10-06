import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceRoleSupabaseClient();

    // Get all users to calculate statistics
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, is_active, subscription_plan, created_at');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
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

    return NextResponse.json({
      stats: {
        total: totalUsers,
        active: activeUsers,
        paid: paidUsers,
        suspended: suspendedUsers,
      },
      debug: {
        totalData: allUsers?.length,
        users: allUsers?.map(u => ({
          email: u.email,
          is_active: u.is_active,
          subscription_plan: u.subscription_plan,
        })),
      },
    });
  } catch (error) {
    console.error('Debug user stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
