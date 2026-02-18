import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const {
      title,
      message,
      type = 'info',
      targetAudience = 'all',
      targetUserIds = [],
      actionUrl,
      actionText,
      priority = 'normal',
      expiresAt,
    } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Authenticate user with anon client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    // Check if user is admin
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.error('Profile check error:', profileError);
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Insert the notification using service role client
    const { data: notification, error: notifError } = await serviceClient
      .from('notifications')
      .insert({
        title,
        message,
        type,
        target_audience: targetAudience,
        target_user_ids: targetUserIds,
        action_url: actionUrl,
        action_text: actionText,
        priority,
        expires_at: expiresAt,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (notifError) {
      console.error('Error creating notification:', notifError);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    // Distribute the notification to target users
    let userCount = 0;

    // First try the RPC function
    const { data: rpcResult, error: rpcError } = await serviceClient.rpc(
      'send_notification_to_audience',
      {
        p_notification_id: notification.id,
      }
    );

    if (!rpcError) {
      userCount = rpcResult || 0;
    } else {
      console.log('RPC not available, trying manual distribution');

      // Fallback: manually create user notifications
      let targetUsers: { id: string }[] = [];

      if (targetAudience === 'all') {
        const { data: users } = await serviceClient
          .from('profiles')
          .select('id');
        targetUsers = users || [];
      } else if (targetAudience === 'free') {
        const { data: users } = await serviceClient
          .from('profiles')
          .select('id')
          .or('subscription_plan.is.null,subscription_plan.eq.free');
        targetUsers = users || [];
      } else if (targetAudience === 'basic') {
        const { data: users } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('subscription_plan', 'basic');
        targetUsers = users || [];
      } else if (targetAudience === 'starter') {
        const { data: users } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('subscription_plan', 'starter');
        targetUsers = users || [];
      }

      if (targetUsers.length > 0) {
        const userNotifications = targetUsers.map(u => ({
          notification_id: notification.id,
          user_id: u.id,
          is_read: false,
          is_dismissed: false,
        }));

        const { error: insertError } = await serviceClient
          .from('user_notifications')
          .insert(userNotifications);

        if (!insertError) {
          userCount = targetUsers.length;
        } else {
          console.error('Error creating user notifications:', insertError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notification,
      usersNotified: userCount,
    });
  } catch (error: unknown) {
    console.error('Error in send notification:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');
