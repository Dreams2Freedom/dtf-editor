import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAdminAction, getClientIp, getUserAgent } from '@/utils/adminLogger';
import { withRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/auth-middleware';
import { validateRequest, schemas } from '@/lib/validation';
import { z } from 'zod';

// Input validation schema
const creditAdjustmentSchema = z.object({
  amount: z.number().int().min(-1000).max(1000).refine(val => val !== 0, {
    message: 'Amount cannot be zero'
  }),
  reason: z.string().min(5).max(500).trim(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the authenticated user first
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('Authenticated user:', user.email);
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile?.is_admin) {
      console.error('Admin check failed for user:', user.email, 'is_admin:', profile?.is_admin);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    console.log('Admin verified:', user.email);

    const { id } = await context.params;
    
    // Validate UUID format to prevent SQL injection
    const userIdValidation = schemas.uuid.safeParse(id);
    if (!userIdValidation.success) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }
    
    // Validate request body
    const validation = await validateRequest(request, creditAdjustmentSchema);
    if (validation.error) return validation.error;
    
    const { amount, reason } = validation.data;
    
    console.log('Credit adjustment by admin:', user.email, 'for user:', id, 'amount:', amount);

    // Get current user credits
    console.log('Querying for user ID:', id);
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', id)
      .single();

    if (userError || !targetUser) {
      console.error('Failed to find user:', { 
        id, 
        error: userError,
        data: targetUser 
      });
      return NextResponse.json({ 
        error: 'User not found',
        details: userError?.message || 'No user data returned'
      }, { status: 404 });
    }
    
    console.log('Found user, current credits:', targetUser.credits_remaining);

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

    // Log admin action
    await logAdminAction({
      adminId: user.id,
      adminEmail: user.email,
      action: amount > 0 ? 'credits.add' : 'credits.remove',
      resourceType: 'credits',
      resourceId: id,
      details: {
        amount: Math.abs(amount),
        reason: reason,
        previous_balance: currentCredits,
        new_balance: newBalance
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
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