import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Verify admin authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!adminCheck || adminCheck.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      );
    }

    // Use service role client to fetch admin users
    const serviceClient = createServiceRoleClient();

    const { data: adminUsers, error: adminError } = await serviceClient
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (adminError) throw adminError;

    // Fetch user details for each admin
    const adminsWithDetails = await Promise.all(
      (adminUsers || []).map(async admin => {
        const { data: authUser } =
          await serviceClient.auth.admin.getUserById(admin.user_id);

        return {
          ...admin,
          user_email: authUser?.user?.email,
          user_name: authUser?.user?.user_metadata?.full_name,
        };
      })
    );

    return NextResponse.json({ admins: adminsWithDetails });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
