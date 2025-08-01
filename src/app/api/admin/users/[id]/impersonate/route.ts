import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, email')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get target user details
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', params.id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow impersonating other admins
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', params.id)
      .single();

    if (targetProfile?.is_admin) {
      return NextResponse.json({ error: 'Cannot impersonate other administrators' }, { status: 403 });
    }

    // Create impersonation session data
    const impersonationData = {
      originalAdminId: user.id,
      originalAdminEmail: adminProfile.email,
      impersonatedUserId: targetUser.id,
      impersonatedUserEmail: targetUser.email,
      startedAt: new Date().toISOString()
    };

    // Store impersonation data in a secure httpOnly cookie
    const cookieStore = cookies();
    cookieStore.set('impersonation_session', JSON.stringify(impersonationData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2, // 2 hours max impersonation session
      path: '/'
    });

    // Log the impersonation action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action: 'user_impersonation_started',
        resource_type: 'user',
        resource_id: params.id,
        details: {
          target_user_email: targetUser.email,
          target_user_name: targetUser.full_name
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      });

    return NextResponse.json({
      success: true,
      impersonatedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.full_name
      },
      message: `Now viewing as ${targetUser.email}. Your admin session is preserved.`
    });

  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const cookieStore = cookies();
    
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