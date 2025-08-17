import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePatch(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const preferences = {
      email_marketing: body.email_marketing || false,
      email_updates: body.email_updates || false,
      email_tips: body.email_tips || false,
      credit_alerts: body.credit_alerts || false,
      subscription_reminders: body.subscription_reminders || false,
    };

    // Store preferences in profile metadata
    const { data, error } = await supabase
      .from('profiles')
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Notification preferences updated successfully',
      preferences: data.notification_preferences 
    });
  } catch (error) {
    console.error('Notification preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const PATCH = withRateLimit(handlePatch, 'api');