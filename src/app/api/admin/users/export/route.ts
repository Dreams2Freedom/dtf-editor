import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
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
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const userIds = searchParams
      .get('userIds')
      ?.split(',')
      .filter(id => id);

    // Build query
    let query = supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        created_at,
        last_sign_in_at,
        subscription_plan,
        subscription_status,
        subscription_period_start,
        subscription_period_end,
        credits_remaining,
        stripe_customer_id,
        stripe_subscription_id,
        is_admin,
        user_settings
      `
      )
      .order('created_at', { ascending: false });

    // Filter by user IDs if provided
    if (userIds && userIds.length > 0) {
      query = query.in('id', userIds);
    }

    const { data: users, error } = await query;

    if (error) {
      throw error;
    }

    if (!users) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    // Get additional data for each user
    const enrichedUsers = await Promise.all(
      users.map(async user => {
        // Get credit transactions
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('type, amount, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Get processed images count
        const { count: imageCount } = await supabase
          .from('processed_images')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          ...user,
          recent_transactions: transactions || [],
          total_images_processed: imageCount || 0,
          user_settings: user.user_settings || {},
          // Mask sensitive data
          stripe_customer_id: user.stripe_customer_id
            ? `${user.stripe_customer_id.substring(0, 8)}...`
            : null,
          stripe_subscription_id: user.stripe_subscription_id
            ? `${user.stripe_subscription_id.substring(0, 8)}...`
            : null,
        };
      })
    );

    // Format based on requested format
    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Email',
        'Full Name',
        'Created At',
        'Last Sign In',
        'Plan',
        'Status',
        'Credits',
        'Total Images',
        'Admin',
      ];

      const rows = enrichedUsers.map(user => [
        user.id,
        user.email,
        user.full_name || '',
        new Date(user.created_at).toISOString(),
        user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toISOString()
          : '',
        user.subscription_plan || 'free',
        user.subscription_status || '',
        user.credits_remaining || 0,
        user.total_images_processed,
        user.is_admin ? 'Yes' : 'No',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row =>
          row
            .map(cell =>
              typeof cell === 'string' && cell.includes(',')
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(',')
        ),
      ].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // Return JSON
      return NextResponse.json(
        {
          export_date: new Date().toISOString(),
          total_users: enrichedUsers.length,
          users: enrichedUsers,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.json"`,
          },
        }
      );
    }
  } catch (error) {
    console.error('Error exporting users:', error);
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
