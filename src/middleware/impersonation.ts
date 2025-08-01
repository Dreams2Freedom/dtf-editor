import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export interface ImpersonationData {
  originalAdminId: string;
  originalAdminEmail: string;
  impersonatedUserId: string;
  impersonatedUserEmail: string;
  startedAt: string;
}

export async function handleImpersonation(request: NextRequest, response: NextResponse) {

  // Check for impersonation session
  const impersonationCookie = request.cookies.get('impersonation_session');
  
  if (impersonationCookie) {
    try {
      const impersonationData: ImpersonationData = JSON.parse(impersonationCookie.value);
      
      // Add impersonation headers for client components
      response.headers.set('x-impersonation-active', 'true');
      response.headers.set('x-impersonated-user-id', impersonationData.impersonatedUserId);
      response.headers.set('x-impersonated-user-email', impersonationData.impersonatedUserEmail);
      response.headers.set('x-original-admin-email', impersonationData.originalAdminEmail);
      
      // Check if impersonation has expired (2 hours)
      const startedAt = new Date(impersonationData.startedAt);
      const now = new Date();
      const hoursSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
      
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