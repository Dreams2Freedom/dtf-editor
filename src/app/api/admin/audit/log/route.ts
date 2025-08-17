import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AdminSession } from '@/types/admin';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    // Verify admin session
    const sessionCookie = cookies().get('admin_session');
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session: AdminSession = JSON.parse(sessionCookie.value);
    const body = await request.json();
    
    const {
      action,
      resource_type,
      resource_id,
      details = {}
    } = body;

    if (!action || !resource_type) {
      return NextResponse.json(
        { success: false, error: 'Action and resource type are required' },
        { status: 400 }
      );
    }

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

    // Log the action
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_admin_id: session.user.id,
      p_action: action,
      p_resource_type: resource_type,
      p_resource_id: resource_id,
      p_details: details,
      p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      p_user_agent: request.headers.get('user-agent')
    });

    if (error) {
      console.error('Audit log error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to log action' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { log_id: data }
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');