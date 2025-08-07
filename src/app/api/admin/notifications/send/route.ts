import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get notification data
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
      expiresAt
    } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Create the notification
    const { data: notification, error: notifError } = await supabase
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
        is_active: true
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

    // Send notification to target audience
    const { data: userCount, error: sendError } = await supabase
      .rpc('send_notification_to_audience', {
        p_notification_id: notification.id
      });

    if (sendError) {
      console.error('Error sending notification:', sendError);
      // Don't fail the whole request, notification was created
    }

    return NextResponse.json({
      success: true,
      notification,
      usersNotified: userCount || 0
    });

  } catch (error: any) {
    console.error('Error in send notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}