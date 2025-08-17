import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    // Get current user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Use service role client for insert
    const serviceClient = createServiceRoleClient();
    
    // Test direct RPC call
    const testData = {
      p_user_id: user.id,
      p_original_filename: 'direct_test.png',
      p_processed_filename: 'direct_test_processed.png',
      p_operation_type: 'upscale',
      p_file_size: 1024,
      p_processing_status: 'completed',
      p_storage_url: 'https://via.placeholder.com/150',
      p_thumbnail_url: 'https://via.placeholder.com/150',
      p_metadata: { test: true, method: 'direct' }
    };
    
    console.log('Attempting RPC call with:', testData);
    
    const { data, error } = await serviceClient.rpc('insert_processed_image', testData);
    
    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details 
      });
    }
    
    // Now check if it was saved
    const { data: images } = await serviceClient.rpc('get_user_images', {
      p_user_id: user.id
    });
    
    return NextResponse.json({
      success: true,
      insertedId: data,
      totalImages: images?.length || 0,
      message: 'Direct save test completed'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');