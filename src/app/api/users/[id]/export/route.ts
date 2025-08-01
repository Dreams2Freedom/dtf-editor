import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = params.id;
    
    // Check if user is requesting their own data or is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    // Only allow users to export their own data or admins to export any data
    if (user.id !== userId && !profile?.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user profile data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all user data for GDPR compliance
    const [
      { data: transactions },
      { data: processedImages },
      { data: collections },
      { data: uploads },
      { data: costTracking }
    ] = await Promise.all([
      // Credit transactions
      supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Processed images
      supabase
        .from('processed_images')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Collections
      supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // Uploads
      supabase
        .from('uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      // API cost tracking
      supabase
        .from('api_cost_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    // Compile all user data
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      profile: {
        ...userData,
        // Mask sensitive data
        stripe_customer_id: userData.stripe_customer_id ? 'REDACTED' : null,
        stripe_subscription_id: userData.stripe_subscription_id ? 'REDACTED' : null
      },
      credit_transactions: transactions || [],
      processed_images: processedImages || [],
      collections: collections || [],
      uploads: uploads || [],
      api_usage: costTracking || [],
      summary: {
        total_transactions: transactions?.length || 0,
        total_images_processed: processedImages?.length || 0,
        total_collections: collections?.length || 0,
        total_uploads: uploads?.length || 0,
        total_api_calls: costTracking?.length || 0,
        account_created: userData.created_at,
        last_activity: userData.updated_at
      }
    };

    // Return as downloadable JSON file
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}