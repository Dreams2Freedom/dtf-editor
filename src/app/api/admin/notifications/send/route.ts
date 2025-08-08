import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Create admin client with service role key to bypass RLS
    const adminSupabase = createAdminSupabaseClient();
    
    // Get the auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is an admin using the admin client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin using admin client
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.error('Profile check error:', profileError);
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

    // Create the notification using admin client to bypass RLS
    const { data: notification, error: notifError } = await adminSupabase
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

    // Try to send notification to target audience
    let userCount = 0;
    
    try {
      // Check if RPC function exists by trying to call it
      const { data: rpcResult, error: sendError } = await adminSupabase
        .rpc('send_notification_to_audience', {
          p_notification_id: notification.id
        });
      
      if (sendError) {
        console.log('RPC function not available, creating user notifications manually');
        
        // Manually create user notifications based on target audience
        if (targetAudience === 'all') {
          // Get all users
          const { data: users } = await adminSupabase
            .from('profiles')
            .select('id');
          
          if (users && users.length > 0) {
            // Create notification entries for all users
            const userNotifications = users.map(user => ({
              notification_id: notification.id,
              user_id: user.id,
              is_read: false,
              is_dismissed: false
            }));
            
            const { data: inserted, error: insertError } = await adminSupabase
              .from('user_notifications')
              .insert(userNotifications);
            
            if (!insertError) {
              userCount = users.length;
            }
          }
        } else if (targetAudience === 'free') {
          // Get free tier users
          const { data: users } = await adminSupabase
            .from('profiles')
            .select('id')
            .or('subscription_plan.is.null,subscription_plan.eq.free');
          
          if (users && users.length > 0) {
            const userNotifications = users.map(user => ({
              notification_id: notification.id,
              user_id: user.id,
              is_read: false,
              is_dismissed: false
            }));
            
            await adminSupabase
              .from('user_notifications')
              .insert(userNotifications);
            
            userCount = users.length;
          }
        }
        // Add more audience types as needed
      } else {
        userCount = rpcResult || 0;
      }
    } catch (err) {
      console.error('Error in notification distribution:', err);
      // Continue anyway, notification was created
    }

    return NextResponse.json({
      success: true,
      notification,
      usersNotified: userCount
    });

  } catch (error: any) {
    console.error('Error in send notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}