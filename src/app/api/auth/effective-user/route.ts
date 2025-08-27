import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Get the effective user - either the actual authenticated user or the impersonated user
 * This endpoint is used by the client to determine who to show as logged in
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // First, check if we're in an impersonation session
    const impersonationCookie = cookieStore.get('impersonation_session');
    const authOverrideCookie = cookieStore.get('supabase-auth-override');
    
    if (impersonationCookie && authOverrideCookie) {
      // We're impersonating - return the impersonated user's data
      try {
        const impersonationData = JSON.parse(impersonationCookie.value);
        const serviceSupabase = createServiceRoleClient();
        
        // Get the impersonated user's profile data
        const { data: profile, error: profileError } = await serviceSupabase
          .from('profiles')
          .select('*')
          .eq('id', impersonationData.impersonatedUserId)
          .single();
        
        if (profileError || !profile) {
          console.error('Error fetching impersonated user profile:', profileError);
          // Fall through to regular auth
        } else {
          // Get the impersonated user's auth data from Supabase auth
          const { data: authUser, error: authError } = await serviceSupabase.auth.admin.getUserById(
            impersonationData.impersonatedUserId
          );
          
          if (!authError && authUser?.user) {
            // Return combined auth user and profile data
            return NextResponse.json({
              user: {
                id: authUser.user.id,
                email: authUser.user.email,
                app_metadata: authUser.user.app_metadata,
                user_metadata: authUser.user.user_metadata,
                created_at: authUser.user.created_at,
              },
              profile,
              isImpersonating: true,
              impersonationData: {
                originalAdminId: impersonationData.originalAdminId,
                originalAdminEmail: impersonationData.originalAdminEmail,
                startedAt: impersonationData.startedAt
              }
            });
          }
        }
      } catch (error) {
        console.error('Error parsing impersonation data:', error);
        // Fall through to regular auth
      }
    }
    
    // No impersonation or impersonation failed - get regular authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        user: null, 
        profile: null,
        isImpersonating: false 
      });
    }
    
    // Get the user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      },
      profile,
      isImpersonating: false
    });
    
  } catch (error) {
    console.error('Error in effective-user endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}