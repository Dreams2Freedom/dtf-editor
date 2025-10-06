import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePatch(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const serviceClient = createServiceRoleSupabaseClient();

    // Update coupon
    const { data: coupon, error } = await serviceClient
      .from('coupons')
      .update({ is_active: body.is_active })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating coupon:', error);
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Coupons feature not yet configured' },
          { status: 501 }
        );
      }
      throw error;
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error in update coupon API:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const serviceClient = createServiceRoleSupabaseClient();

    // Delete coupon
    const { error } = await serviceClient
      .from('coupons')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting coupon:', error);
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Coupons feature not yet configured' },
          { status: 501 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete coupon API:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const PATCH = withRateLimit(handlePatch, 'admin');
export const DELETE = withRateLimit(handleDelete, 'admin');
