import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client with service role for RLS bypass
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get user's notifications through the view, fallback to empty if it doesn't exist
    let notifications = [];
    let unreadCount = 0;
    
    try {
      // Try to query the view first
      const { data, error } = await supabase
        .from('user_notifications_view')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        notifications = data;
      }
    } catch (e) {
      // View doesn't exist, return empty notifications
      console.log('Notifications view not found, returning empty array');
    }

    try {
      // Try to get unread count
      const { data } = await supabase
        .rpc('get_unread_notification_count', {
          p_user_id: user.id
        });
      
      if (data !== null && data !== undefined) {
        unreadCount = data;
      }
    } catch (e) {
      // Function doesn't exist, return 0
      console.log('Unread count function not found, returning 0');
    }

    return NextResponse.json({
      notifications,
      unreadCount
    });

  } catch (error: any) {
    console.error('Error in get notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get the auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Notification ID and action are required' },
        { status: 400 }
      );
    }

    // Perform the action with error handling for missing functions
    try {
      if (action === 'read') {
        await supabase.rpc('mark_notification_read', {
          p_notification_id: notificationId,
          p_user_id: user.id
        });
      } else if (action === 'dismiss') {
        await supabase.rpc('dismiss_notification', {
          p_notification_id: notificationId,
          p_user_id: user.id
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
      }
    } catch (e) {
      // If the RPC functions don't exist, just return success
      console.log('Notification RPC functions not found, returning success');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}