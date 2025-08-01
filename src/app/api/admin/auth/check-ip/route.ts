import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AdminSession } from '@/types/admin';

function isIPInWhitelist(clientIP: string, whitelist: string[]): boolean {
  // If no whitelist, allow all
  if (!whitelist || whitelist.length === 0) {
    return true;
  }

  // Always allow localhost in development
  if (process.env.NODE_ENV === 'development' && (clientIP === '::1' || clientIP === '127.0.0.1')) {
    return true;
  }

  // Check if IP is in whitelist
  return whitelist.some(allowedIP => {
    // Support CIDR notation in the future
    // For now, just do exact match
    return allowedIP === clientIP;
  });
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP
    const clientIP = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      'unknown';

    // Get admin session
    const sessionCookie = cookies().get('admin_session');
    if (!sessionCookie) {
      return NextResponse.json({
        allowed: false,
        reason: 'No session',
        ip: clientIP
      });
    }

    const session: AdminSession = JSON.parse(sessionCookie.value);
    
    // Check IP whitelist
    const allowed = isIPInWhitelist(clientIP, session.user.ip_whitelist);

    if (!allowed) {
      // Log blocked attempt
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
          },
        }
      );
      await supabase.rpc('log_admin_action', {
        p_admin_id: session.user.id,
        p_action: 'admin.ip_blocked',
        p_resource_type: 'admin_user',
        p_resource_id: session.user.id,
        p_details: { 
          blocked_ip: clientIP,
          whitelist: session.user.ip_whitelist 
        },
        p_ip_address: clientIP
      });
    }

    return NextResponse.json({
      allowed,
      ip: clientIP,
      whitelist: session.user.ip_whitelist
    });
  } catch (error) {
    console.error('IP check error:', error);
    return NextResponse.json({
      allowed: false,
      reason: 'Error checking IP'
    });
  }
}