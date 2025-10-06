import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Middleware to check if the current user is an admin
 * Wraps API route handlers to ensure only admins can access them
 */
export function withAdminAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const supabase = createServerSupabaseClient();

      // Get the current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // User is authenticated and is an admin, proceed with the handler
      return handler(request);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if a user is an admin (for use in server components)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    return profile?.is_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
