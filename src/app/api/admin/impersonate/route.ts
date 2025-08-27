import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// GET endpoint to check impersonation status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get('impersonation_session');
    
    if (!impersonationCookie) {
      return NextResponse.json({ isImpersonating: false });
    }

    const impersonationData = JSON.parse(impersonationCookie.value);
    return NextResponse.json({
      isImpersonating: true,
      ...impersonationData
    });
  } catch (error) {
    console.error('Error checking impersonation status:', error);
    return NextResponse.json({ isImpersonating: false });
  }
}

// DELETE endpoint to end impersonation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const cookieStore = await cookies();
    
    // Get impersonation session
    const impersonationCookie = cookieStore.get('impersonation_session');
    if (!impersonationCookie) {
      return NextResponse.json({ error: 'No active impersonation session' }, { status: 400 });
    }

    const impersonationData = JSON.parse(impersonationCookie.value);

    // Log the end of impersonation
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: impersonationData.originalAdminId,
        action: 'user_impersonation_ended',
        resource_type: 'user',
        resource_id: impersonationData.impersonatedUserId,
        details: {
          duration_seconds: Math.floor((Date.now() - new Date(impersonationData.startedAt).getTime()) / 1000),
          target_user_email: impersonationData.impersonatedUserEmail
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      });

    // Clear impersonation cookie
    cookieStore.delete('impersonation_session');

    // Clear the user override cookie if it exists
    cookieStore.delete('supabase-auth-override');

    return NextResponse.json({
      success: true,
      message: 'Impersonation session ended'
    });

  } catch (error) {
    console.error('Error ending impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    );
  }
}