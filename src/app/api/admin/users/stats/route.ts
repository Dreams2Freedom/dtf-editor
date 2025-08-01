import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin using simplified auth
    const { data: { user } } = await supabase.auth.getUser();
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

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users count
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get paid users count (users with non-free plan)
    const { count: paidUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('subscription_plan', ['basic', 'starter', 'pro']);

    // Get suspended users count
    const { count: suspendedUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    return NextResponse.json({
      total: totalUsers || 0,
      active: activeUsers || 0,
      paid: paidUsers || 0,
      suspended: suspendedUsers || 0
    });
  } catch (error) {
    console.error('Admin user stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}