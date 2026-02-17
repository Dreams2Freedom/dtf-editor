import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/auth-middleware';

async function handleLogout(request: NextRequest) {
  // Verify admin authentication first
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const cookieStore = await cookies();

    // Sign out from Supabase regardless of admin_session cookie format
    try {
      const supabase = createServerClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {
                // Handle cookie setting errors
              }
            },
          },
        }
      );

      await supabase.auth.signOut();
    } catch (error) {
      // Ignore errors during logout
    }

    // Create response and clear admin session cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete('admin_session');
    response.cookies.delete('admin_logged_in');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with rate limiting
export const POST = withRateLimit(handleLogout, 'admin');
