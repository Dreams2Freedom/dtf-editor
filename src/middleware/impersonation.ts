import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyCookieValue } from '@/lib/cookie-signing';

export interface ImpersonationData {
  originalAdminId: string;
  originalAdminEmail: string;
  impersonatedUserId: string;
  impersonatedUserEmail: string;
  startedAt: string;
}

export async function handleImpersonation(
  request: NextRequest,
  response: NextResponse
) {
  // Check for impersonation session
  const impersonationCookie = request.cookies.get('impersonation_session');

  if (impersonationCookie) {
    // SECURITY: Verify the request has a valid authenticated session
    // before applying impersonation headers
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // No valid session - skip impersonation logic entirely
        console.warn(
          'Impersonation cookie present but no valid session - ignoring'
        );
        response.cookies.delete('impersonation_session');
        return;
      }

      // Verify the authenticated user is an admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        // User is not an admin - skip impersonation logic
        console.warn(
          'Impersonation cookie present but user is not admin - ignoring'
        );
        response.cookies.delete('impersonation_session');
        return;
      }

      // SEC-009: Verify HMAC signature on impersonation cookie before trusting it
      const verifiedPayload = await verifyCookieValue(impersonationCookie.value);
      if (!verifiedPayload) {
        console.warn(
          'Impersonation cookie has invalid HMAC signature — possible forgery attempt'
        );
        response.cookies.delete('impersonation_session');
        return;
      }

      // Valid admin session + valid signature - proceed with impersonation
      const impersonationData: ImpersonationData = JSON.parse(verifiedPayload);

      // Add impersonation headers for client components
      response.headers.set('x-impersonation-active', 'true');
      response.headers.set(
        'x-impersonated-user-id',
        impersonationData.impersonatedUserId
      );
      response.headers.set(
        'x-impersonated-user-email',
        impersonationData.impersonatedUserEmail
      );
      response.headers.set(
        'x-original-admin-email',
        impersonationData.originalAdminEmail
      );

      // Check if impersonation has expired (2 hours)
      const startedAt = new Date(impersonationData.startedAt);
      const now = new Date();
      const hoursSinceStart =
        (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceStart > 2) {
        // Expired - clear the cookie
        response.cookies.delete('impersonation_session');
        response.headers.set('x-impersonation-expired', 'true');
      }
    } catch (error) {
      console.error('Error parsing impersonation session:', error);
      response.cookies.delete('impersonation_session');
    }
  }
}
