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

async function handleCreditAdjustment(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    
    // Validate UUID format to prevent SQL injection
    const userIdValidation = schemas.uuid.safeParse(id);
    if (!userIdValidation.success) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }
    
    // Validate request body
    const validation = await validateRequest(request, creditAdjustmentSchema);
    if (validation.error) return validation.error;
    
    const { amount, reason } = validation.data;
    
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

// Export with rate limiting
export const POST = withRateLimit(handleCreditAdjustment, 'admin');