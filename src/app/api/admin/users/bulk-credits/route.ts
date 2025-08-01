import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
    let errors: string[] = [];

    console.log(`[Bulk Credits] Starting ${operation} operation for ${userIds.length} users with amount: ${amount}`);

    if (operation === 'add') {
      // Add credits to existing balance
      // Since add_credits_bulk RPC doesn't exist, we'll do manual updates
      for (const userId of userIds) {
          try {
            // Get current credits
            const { data: currentUser, error: fetchError } = await supabase
              .from('profiles')
              .select('credits_remaining')
              .eq('id', userId)
              .single();

            if (fetchError) {
              errors.push(`Failed to fetch user ${userId}: ${fetchError.message}`);
              continue;
            }

            const currentCredits = currentUser?.credits_remaining ?? 0;
            const newCredits = Math.min(currentCredits + amount, 1000); // Cap at 1000

            // Update credits
            const updateData = {
              credits_remaining: newCredits,
              updated_at: new Date().toISOString()
            };

            const { error: updateError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', userId);

            if (updateError) {
              errors.push(`Failed to update user ${userId}: ${updateError.message}`);
            } else {
              affected++;

              // Log credit transaction
              await supabase
                .from('credit_transactions')
                .insert({
                  user_id: userId,
                  amount,
                  type: 'admin_adjustment',
                  description: `Admin bulk credit addition by ${user.email}`,
                  created_at: new Date().toISOString()
                });
            }
          } catch (err: any) {
            errors.push(`Error processing user ${userId}: ${err.message}`);
          }
        }
    } else {
      // Set credits to specific amount
      const updateData = {
        credits_remaining: amount,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedUsers, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .in('id', userIds)
        .select();

      if (updateError) {
        errors.push(`Update error: ${updateError.message}`);
      } else {
        affected = updatedUsers?.length || 0;

        // Log credit transactions for each user
        for (const userId of userIds) {
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: userId,
              amount,
              type: 'admin_adjustment',
              description: `Admin bulk credit set to ${amount} by ${user.email}`,
              created_at: new Date().toISOString()
            });
        }
      }
    }

    // Log the bulk action
    console.log(`[Admin Bulk Credits] ${operation} ${amount} credits for ${affected} users by ${user.email}`);

    return NextResponse.json({
      success: true,
      operation,
      amount,
      affected,
      total: userIds.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk credit adjustment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}