import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Test with a public image URL that we know works
    const testUrl = 'https://via.placeholder.com/500x500.png';
    
    console.log('[Test Public] Calling saveProcessedImageToGallery with public image...');
    
    const result = await saveProcessedImageToGallery({
      userId: user.id,
      processedUrl: testUrl,
      operationType: 'upscale',
      originalFilename: 'test_public.png',
      metadata: {
        test: true,
        source: 'test-public-image-save'
      }
    });
    
    return NextResponse.json({
      success: !!result,
      imageId: result,
      message: result ? 'Public image saved successfully!' : 'Save failed - check logs'
    });
    
  } catch (error) {
    console.error('[Test Public] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');