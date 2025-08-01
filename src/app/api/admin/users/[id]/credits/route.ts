import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
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
    const { amount, reason } = await request.json();

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // Get current user credits
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentCredits = targetUser.credits_remaining || 0;
    const newBalance = currentCredits + amount;

    if (newBalance < 0) {
      return NextResponse.json({ error: 'Cannot reduce credits below zero' }, { status: 400 });
    }

    // Update user credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newBalance })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Log the credit transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: id,
        amount: amount,
        balance_after: newBalance,
        description: `Admin adjustment: ${reason}`,
        metadata: {
          admin_id: user.id,
          reason: reason,
          adjustment_type: amount > 0 ? 'credit' : 'debit'
        }
      });

    if (transactionError) {
      console.error('Failed to log credit transaction:', transactionError);
    }

    // Log admin action (audit logs table will be added later)
    console.log('Admin credit adjustment:', {
      admin_id: user.id,
      action: amount > 0 ? 'user.add_credits' : 'user.remove_credits',
      resource_type: 'user',
      resource_id: id,
      details: {
        amount: amount,
        reason: reason,
        previous_balance: currentCredits,
        new_balance: newBalance
      }
    });

    return NextResponse.json({
      success: true,
      new_balance: newBalance,
      adjustment: amount
    });
  } catch (error) {
    console.error('Credit adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}