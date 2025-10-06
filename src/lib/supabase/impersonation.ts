import { cookies } from 'next/headers';
import { createServerSupabaseClient, createServiceRoleClient } from './server';

/**
 * Get the current user, taking impersonation into account
 * If an admin is impersonating a user, this returns the impersonated user
 * Otherwise, returns the actual authenticated user
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();

  // Check for impersonation
  const impersonationCookie = cookieStore.get('impersonation_session');
  const authOverrideCookie = cookieStore.get('supabase-auth-override');

  if (impersonationCookie && authOverrideCookie) {
    try {
      const impersonationData = JSON.parse(impersonationCookie.value);
      const serviceSupabase = createServiceRoleClient();

      // Get the impersonated user's data
      const { data: user, error } = await serviceSupabase
        .from('profiles')
        .select('*')
        .eq('id', impersonationData.impersonatedUserId)
        .single();

      if (!error && user) {
        // Return the impersonated user with additional metadata
        return {
          ...user,
          isImpersonated: true,
          originalAdminId: impersonationData.originalAdminId,
          originalAdminEmail: impersonationData.originalAdminEmail,
        };
      }
    } catch (error) {
      console.error('Error getting impersonated user:', error);
    }
  }

  // No impersonation, get the regular authenticated user
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile ? { ...profile, isImpersonated: false } : null;
}

/**
 * Check if current session is an impersonation session
 */
export async function isImpersonating() {
  const cookieStore = await cookies();
  const impersonationCookie = cookieStore.get('impersonation_session');
  return !!impersonationCookie;
}

/**
 * Get impersonation details if active
 */
export async function getImpersonationDetails() {
  const cookieStore = await cookies();
  const impersonationCookie = cookieStore.get('impersonation_session');

  if (!impersonationCookie) {
    return null;
  }

  try {
    return JSON.parse(impersonationCookie.value);
  } catch (error) {
    console.error('Error parsing impersonation cookie:', error);
    return null;
  }
}
