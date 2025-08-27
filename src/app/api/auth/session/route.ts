import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Check for impersonation first
    const impersonationCookie = cookieStore.get('impersonation_session');
    const authOverrideCookie = cookieStore.get('supabase-auth-override');
    
    if (impersonationCookie && authOverrideCookie) {
      // We're impersonating - return the impersonated user's data
      try {
        const impersonationData = JSON.parse(impersonationCookie.value);
        const serviceSupabase = createServiceRoleClient();
        
        // Get the impersonated user's profile
        const { data: profile, error: profileError } = await serviceSupabase
          .from('profiles')
          .select('*')
          .eq('id', impersonationData.impersonatedUserId)
          .single();
        
        if (!profileError && profile) {
          return NextResponse.json({
            authenticated: true,
            user: {
              id: profile.id,
              email: profile.email || impersonationData.impersonatedUserEmail,
              credits_remaining: profile.credits_remaining,
              subscription_status: profile.subscription_status,
              subscription_plan: profile.subscription_plan
            },
            isImpersonating: true
          });
        }
      } catch (error) {
        console.error('Error handling impersonation in session:', error);
        // Fall through to regular auth
      }
    }
    
    // No impersonation - check regular session
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
      },
      isImpersonating: false
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}