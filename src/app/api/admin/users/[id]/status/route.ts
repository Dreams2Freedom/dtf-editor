import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const { status } = await request.json();

    if (!status || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: status === 'active' })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log admin action (when audit logs table is available)
    console.log('Admin status change:', {
      admin_id: user.id,
      action: status === 'active' ? 'user.activate' : 'user.suspend',
      resource_type: 'user',
      resource_id: id,
      details: {
        new_status: status
      }
    });

    return NextResponse.json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('User status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}