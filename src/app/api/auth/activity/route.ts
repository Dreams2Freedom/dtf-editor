import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Update user's last activity timestamp
 * This should be called whenever a user performs an action
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }
    
    // Use service role to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    
    // Update last_activity_at timestamp
    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({ 
        last_activity_at: new Date().toISOString() 
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Failed to update activity timestamp:', updateError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to update activity' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Activity tracking error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}