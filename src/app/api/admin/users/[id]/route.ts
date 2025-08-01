import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and is admin
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Fetch user details
    const { data: userDetails, error: userError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single();

    if (userError || !userDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's credit transactions
    const { data: transactions, error: transError } = await serviceClient
      .from('credit_transactions')
      .select('*')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch user's recent uploads - handle table not existing
    let uploads = [];
    try {
      const { data: uploadsData } = await serviceClient
        .from('uploads')
        .select('*')
        .eq('user_id', params.id)
        .order('created_at', { ascending: false })
        .limit(10);
      uploads = uploadsData || [];
    } catch (error) {
      console.log('Uploads table not found, using empty array');
    }

    // Calculate usage stats
    const { data: usageStats } = await serviceClient
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', params.id)
      .like('description', '%usage%')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalUsageLast30Days = usageStats?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    // Get Stripe customer info if available
    let stripeInfo = null;
    if (userDetails.stripe_customer_id) {
      // TODO: Fetch from Stripe API
      stripeInfo = {
        customer_id: userDetails.stripe_customer_id,
        subscription_status: userDetails.subscription_plan !== 'free' ? 'active' : null
      };
    }

    // Format credit transactions
    const formattedTransactions = (transactions || []).map(t => ({
      id: t.id,
      type: t.type || 'usage',
      amount: t.amount,
      description: t.description,
      created_at: t.created_at
    }));

    return NextResponse.json({
      user: {
        id: userDetails.id,
        email: userDetails.email,
        full_name: userDetails.full_name || `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim() || null,
        plan: userDetails.subscription_plan || 'free',
        status: userDetails.is_active !== false ? 'active' : 'suspended',
        credits_remaining: userDetails.credits_remaining || 0,
        created_at: userDetails.created_at,
        updated_at: userDetails.updated_at,
        last_sign_in_at: userDetails.last_sign_in_at,
        stripe_customer_id: userDetails.stripe_customer_id,
        credit_transactions: formattedTransactions,
        recent_uploads: uploads,
        usage_stats: {
          last_30_days: totalUsageLast30Days,
          total_uploads: uploads.length
        },
        stripe_info: stripeInfo
      }
    });
  } catch (error) {
    console.error('Admin user details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and is admin
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { full_name, email, plan, status } = body;

    // Validate input
    if (!email || !['free', 'basic', 'starter', 'pro'].includes(plan) || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Update user
    const updateData: any = {
      email,
      subscription_plan: plan,
      is_active: status === 'active',
      updated_at: new Date().toISOString()
    };
    
    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }

    const { data: updatedUser, error } = await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ 
      user: {
        ...updatedUser,
        plan: updatedUser.subscription_plan,
        status: updatedUser.is_active ? 'active' : 'suspended'
      }
    });
  } catch (error) {
    console.error('Admin user update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}