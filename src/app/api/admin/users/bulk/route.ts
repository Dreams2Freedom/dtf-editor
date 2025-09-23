import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { AdminAuditService } from '@/services/adminAudit';

async function handlePost(request: NextRequest) {
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
    const { action, userIds } = body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: action and userIds required' },
        { status: 400 }
      );
    }

    let affected = 0;
    const errors: string[] = [];

    switch (action) {
      case 'activate':
        // Activate users
        const { data: activatedUsers, error: activateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .select();
        
        if (activateError) {
          errors.push(`Activate error: ${activateError.message}`);
        } else {
          affected = activatedUsers?.length || 0;
        }
        break;

      case 'suspend':
        // Suspend users
        const { data: suspendedUsers, error: suspendError } = await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .select();
        
        if (suspendError) {
          errors.push(`Suspend error: ${suspendError.message}`);
        } else {
          affected = suspendedUsers?.length || 0;
        }
        break;

      case 'delete':
        // Delete users - Actually delete from auth system
        // This will cascade delete all related data (profiles, images, etc.)
        // Need to use service role client for admin operations
        const serviceClient = createServiceRoleClient();
        let successCount = 0;
        
        for (const userId of userIds) {
          try {
            // Use the service role client to delete the user
            const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId);
            
            if (deleteAuthError) {
              console.error(`Failed to delete user ${userId}:`, deleteAuthError);
              errors.push(`Failed to delete user ${userId}: ${deleteAuthError.message}`);
            } else {
              successCount++;
              console.log(`Successfully deleted user ${userId}`);
            }
          } catch (err) {
            console.error(`Error deleting user ${userId}:`, err);
            errors.push(`Error deleting user ${userId}`);
          }
        }
        
        affected = successCount;
        
        if (successCount === 0) {
          return NextResponse.json(
            { error: 'Failed to delete any users', errors },
            { status: 500 }
          );
        }
        break;

      case 'email':
        // Email functionality would go here
        return NextResponse.json(
          { error: 'Email functionality not implemented yet' },
          { status: 501 }
        );

      case 'credits':
        // Bulk credit adjustment would go here
        return NextResponse.json(
          { error: 'Bulk credit adjustment not implemented yet' },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log the bulk action
    console.log(`[Admin Bulk Action] ${action} performed on ${affected} users by ${user.email}`);

    // Create audit log entry
    const auditService = AdminAuditService.getInstance();
    await auditService.logAction(
      {
        user: {
          id: user.id,
          email: user.email || ''
        },
        role: 'admin',
        createdAt: new Date()
      },
      {
        action: 'user.bulk_update',
        resource_type: 'user',
        details: {
          bulk_action: action,
          affected_users: affected,
          total_users: userIds.length,
          user_ids: userIds,
          errors: errors.length > 0 ? errors : undefined
        }
      },
      request
    );

    return NextResponse.json({
      success: true,
      action,
      affected,
      total: userIds.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');