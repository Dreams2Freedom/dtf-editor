import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { AdminAuditService } from '@/services/adminAudit';

async function handlePatch(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    // Log admin action
    const auditService = AdminAuditService.getInstance();
    await auditService.logAction(
      {
        user: {
          id: user.id,
          email: user.email || '',
        },
        role: 'admin',
        createdAt: new Date(),
      },
      {
        action: 'user.status_change',
        resource_type: 'user',
        resource_id: id,
        details: {
          new_status: status,
          action: status === 'active' ? 'activated' : 'suspended',
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      status: status,
    });
  } catch (error) {
    console.error('User status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const PATCH = withRateLimit(handlePatch, 'admin');
