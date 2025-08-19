import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user has a valid session
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    // Get user profile to return additional info
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status, subscription_plan')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        ...profile
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}