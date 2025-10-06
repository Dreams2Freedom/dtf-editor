import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// GET: Fetch notification preferences
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch notification preferences
    const { data: preferences, error } = await supabase
      .from('admin_notification_preferences')
      .select('*')
      .eq('admin_email', user.email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        admin_email: user.email,
        is_super_admin: false,
        notify_new_signups: true,
        notify_new_subscriptions: true,
        notify_cancellations: true,
        notify_refund_requests: true,
        notify_support_tickets: true,
        notify_high_value_purchases: true,
        notify_failed_payments: true,
        daily_digest: false,
        weekly_digest: true,
        monthly_report: true,
        min_purchase_value_for_notification: 20,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        timezone: 'America/New_York',
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error in GET /api/admin/notification-preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.admin_email;
    delete updates.is_super_admin;
    delete updates.created_at;
    delete updates.updated_at;

    // Check if preferences exist
    const { data: existing, error: checkError } = await supabase
      .from('admin_notification_preferences')
      .select('id')
      .eq('admin_email', user.email)
      .single();

    let result;
    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('admin_notification_preferences')
        .update(updates)
        .eq('admin_email', user.email)
        .select()
        .single();

      if (error) {
        console.error('Error updating notification preferences:', error);
        return NextResponse.json(
          { error: 'Failed to update preferences' },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('admin_notification_preferences')
        .insert({
          admin_email: user.email,
          ...updates,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification preferences:', error);
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        );
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      preferences: result,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/notification-preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Check if a notification should be sent based on preferences
export async function POST(request: NextRequest) {
  try {
    const { adminEmail, notificationType } = await request.json();

    if (!adminEmail || !notificationType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service role to check preferences
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch notification preferences
    const { data: preferences, error } = await supabase
      .from('admin_notification_preferences')
      .select('*')
      .eq('admin_email', adminEmail)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to check preferences' },
        { status: 500 }
      );
    }

    // If no preferences, default to sending notifications
    if (!preferences) {
      return NextResponse.json({ shouldSend: true });
    }

    // Check if this notification type is enabled
    const notificationMap: Record<string, string> = {
      new_signup: 'notify_new_signups',
      new_subscription: 'notify_new_subscriptions',
      cancellation: 'notify_cancellations',
      refund_request: 'notify_refund_requests',
      support_ticket: 'notify_support_tickets',
      high_value_purchase: 'notify_high_value_purchases',
      failed_payment: 'notify_failed_payments',
    };

    const preferenceKey = notificationMap[notificationType];
    if (!preferenceKey) {
      return NextResponse.json({ shouldSend: true }); // Unknown type, send by default
    }

    const shouldSend = preferences[preferenceKey] !== false;

    // Check quiet hours if enabled
    if (
      shouldSend &&
      preferences.quiet_hours_start &&
      preferences.quiet_hours_end
    ) {
      const now = new Date();
      const timezone = preferences.timezone || 'America/New_York';

      // Convert to admin's timezone
      const adminTime = new Date(
        now.toLocaleString('en-US', { timeZone: timezone })
      );
      const currentHour = adminTime.getHours();
      const currentMinute = adminTime.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = preferences.quiet_hours_start
        .split(':')
        .map(Number);
      const [endHour, endMinute] = preferences.quiet_hours_end
        .split(':')
        .map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Check if current time is within quiet hours
      let inQuietHours = false;
      if (startMinutes <= endMinutes) {
        // Quiet hours don't cross midnight
        inQuietHours =
          currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
      } else {
        // Quiet hours cross midnight
        inQuietHours =
          currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
      }

      if (inQuietHours) {
        return NextResponse.json({
          shouldSend: false,
          reason: 'quiet_hours',
          message: `Notification delayed due to quiet hours (${preferences.quiet_hours_start} - ${preferences.quiet_hours_end} ${timezone})`,
        });
      }
    }

    return NextResponse.json({ shouldSend });
  } catch (error) {
    console.error('Error in POST /api/admin/notification-preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
