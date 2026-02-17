import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { AdminAuditService } from '@/services/adminAudit';

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userIds, amount, operation } = body;

    // Validate inputs
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: userIds required' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { error: 'Invalid request: valid amount required' },
        { status: 400 }
      );
    }

    if (!['add', 'set'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid request: operation must be "add" or "set"' },
        { status: 400 }
      );
    }

    // Validate amount limits
    if (operation === 'add' && amount > 500) {
      return NextResponse.json(
        { error: 'Cannot add more than 500 credits at once' },
        { status: 400 }
      );
    }

    if (operation === 'set' && amount > 1000) {
      return NextResponse.json(
        { error: 'Cannot set credits higher than 1000' },
        { status: 400 }
      );
    }

    let affected = 0;
    const errors: string[] = [];

    console.log(
      `[Bulk Credits] Starting ${operation} operation for ${userIds.length} users with amount: ${amount}`
    );

    // NEW-18: Use atomic RPC functions to prevent lost-update race conditions.
    // Falls back to non-atomic approach if RPC is not yet deployed.
    if (operation === 'add') {
      const description = `Admin bulk credit addition by ${user.id}`;
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'add_credits_bulk',
        {
          p_user_ids: userIds,
          p_amount: amount,
          p_admin_id: user.id,
          p_description: description,
        }
      );

      if (rpcError) {
        // Fallback: non-atomic approach if RPC not deployed yet
        console.error('add_credits_bulk RPC failed, using fallback:', rpcError.message);
        for (const userId of userIds) {
          try {
            const { data: currentUser, error: fetchError } = await supabase
              .from('profiles')
              .select('credits_remaining')
              .eq('id', userId)
              .single();

            if (fetchError) {
              errors.push(`Failed to fetch user ${userId}`);
              continue;
            }

            const currentCredits = currentUser?.credits_remaining ?? 0;
            const newCredits = Math.min(currentCredits + amount, 1000);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                credits_remaining: newCredits,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (updateError) {
              errors.push(`Failed to update user ${userId}`);
            } else {
              affected++;
              await supabase.from('credit_transactions').insert({
                user_id: userId,
                amount,
                type: 'admin_adjustment',
                description,
                created_at: new Date().toISOString(),
              });
            }
          } catch (err: any) {
            errors.push(`Error processing user ${userId}`);
          }
        }
      } else {
        affected = rpcResult?.length || 0;
      }
    } else {
      const description = `Admin bulk credit set to ${amount} by ${user.id}`;
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'set_credits_bulk',
        {
          p_user_ids: userIds,
          p_amount: amount,
          p_admin_id: user.id,
          p_description: description,
        }
      );

      if (rpcError) {
        // Fallback: non-atomic approach
        console.error('set_credits_bulk RPC failed, using fallback:', rpcError.message);
        const { data: updatedUsers, error: updateError } = await supabase
          .from('profiles')
          .update({
            credits_remaining: amount,
            updated_at: new Date().toISOString(),
          })
          .in('id', userIds)
          .select();

        if (updateError) {
          errors.push('Update error');
        } else {
          affected = updatedUsers?.length || 0;
          for (const userId of userIds) {
            await supabase.from('credit_transactions').insert({
              user_id: userId,
              amount,
              type: 'admin_adjustment',
              description,
              created_at: new Date().toISOString(),
            });
          }
        }
      } else {
        affected = rpcResult?.length || 0;
      }
    }

    // Log the bulk action
    console.log(
      `[Admin Bulk Credits] ${operation} ${amount} credits for ${affected} users by admin ${user.id}`
    );

    // Create audit log entry
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
        action: 'user.bulk_credits',
        resource_type: 'user',
        details: {
          operation,
          amount,
          affected_users: affected,
          total_users: userIds.length,
          user_ids: userIds,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
      request
    );

    return NextResponse.json({
      success: true,
      operation,
      amount,
      affected,
      total: userIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk credit adjustment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');
