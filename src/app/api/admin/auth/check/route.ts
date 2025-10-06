import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const cookieStore = await cookies();
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

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Not an admin' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: profile.email,
          full_name: profile.full_name,
          is_admin: profile.is_admin,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
