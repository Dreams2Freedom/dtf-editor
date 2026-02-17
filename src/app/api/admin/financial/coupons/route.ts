import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
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

    // Use service role client for data access
    const serviceClient = createServiceRoleSupabaseClient();

    // Fetch coupons
    const { data: coupons, error } = await serviceClient
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      // If table doesn't exist, return empty data
      if (error.code === '42P01') {
        return NextResponse.json({
          coupons: [],
          metrics: {
            total_coupons: 0,
            active_coupons: 0,
            expired_coupons: 0,
            total_uses: 0,
            total_discount_given: 0,
            most_used_coupon: null,
          },
        });
      }
      throw error;
    }

    const now = new Date();

    // Calculate metrics
    const metrics = {
      total_coupons: coupons?.length || 0,
      active_coupons:
        coupons?.filter(c => c.is_active && new Date(c.valid_until) >= now)
          .length || 0,
      expired_coupons:
        coupons?.filter(c => new Date(c.valid_until) < now).length || 0,
      total_uses:
        coupons?.reduce((sum, c) => sum + (c.uses_count || 0), 0) || 0,
      total_discount_given:
        coupons?.reduce((sum, c) => {
          const uses = c.uses_count || 0;
          const discount = c.discount_value || 0;
          return sum + uses * discount;
        }, 0) || 0,
      most_used_coupon: coupons?.length
        ? coupons.reduce((prev, curr) =>
            (curr.uses_count || 0) > (prev.uses_count || 0) ? curr : prev
          ).code
        : null,
    };

    return NextResponse.json({
      coupons: coupons || [],
      metrics,
    });
  } catch (error) {
    console.error('Error in coupons API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
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

    // NEW-17: Validate coupon input
    if (
      !body.code ||
      typeof body.code !== 'string' ||
      body.code.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }
    if (!body.discount_type || !['percentage', 'fixed'].includes(body.discount_type)) {
      return NextResponse.json(
        { error: 'Invalid discount type (must be "percentage" or "fixed")' },
        { status: 400 }
      );
    }
    const discountValue = Number(body.discount_value);
    if (
      isNaN(discountValue) ||
      discountValue <= 0 ||
      (body.discount_type === 'percentage' && discountValue > 100) ||
      (body.discount_type === 'fixed' && discountValue > 10000)
    ) {
      return NextResponse.json(
        { error: 'Invalid discount value' },
        { status: 400 }
      );
    }

    // Use service role client for data access
    const serviceClient = createServiceRoleSupabaseClient();

    // Create coupon
    const { data: coupon, error } = await serviceClient
      .from('coupons')
      .insert([
        {
          code: body.code.trim().toUpperCase(),
          description: body.description,
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          min_purchase: body.min_purchase || 0,
          max_uses: body.max_uses || null,
          uses_count: 0,
          valid_from: body.valid_from,
          valid_until: body.valid_until,
          is_active: true,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      // If table doesn't exist, return a friendly error
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
    console.error('Error in create coupon API:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
export const POST = withRateLimit(handlePost, 'admin');
