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
        // Delete users - This is a soft delete approach
        // First, anonymize their data
        const { data: deletedUsers, error: deleteError } = await supabase
          .from('profiles')
          .update({ 
            email_notifications: false,
            subscription_status: 'deleted',
            subscription_plan: 'free',
            credits_remaining: 0,
            first_name: 'Deleted',
            last_name: 'User',
            company_name: null,
            phone_number: null,
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .select();
        
        if (deleteError) {
          errors.push(`Delete error: ${deleteError.message}`);
        } else {
          affected = deletedUsers?.length || 0;
          
          // Also delete their images
          const { error: imagesError } = await supabase
            .from('processed_images')
            .delete()
            .in('user_id', userIds);
          
          if (imagesError) {
            errors.push(`Failed to delete user images: ${imagesError.message}`);
          }
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