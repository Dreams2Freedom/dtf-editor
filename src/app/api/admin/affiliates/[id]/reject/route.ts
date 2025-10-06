import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify the request is from an authenticated admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get rejection reason from request body
    const { rejectionReason } = await request.json();

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Use service role client to update affiliate status
    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('affiliates')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_at: new Date().toISOString(),
        rejected_by: session.user.id,
      })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
