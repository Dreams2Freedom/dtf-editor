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
    
    // Test with a simple SVG data URL
    const testSvgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="red"/>
      </svg>
    `).toString('base64');
    
    console.log('[Test SVG] Testing SVG save with data URL length:', testSvgDataUrl.length);
    
    const result = await saveProcessedImageToGallery({
      userId: user.id,
      processedUrl: testSvgDataUrl,
      operationType: 'vectorization',
      originalFilename: 'test_svg.svg',
      metadata: {
        test: true,
        source: 'test-svg-save'
      }
    });
    
    return NextResponse.json({
      success: !!result,
      imageId: result,
      message: result ? 'SVG saved successfully!' : 'SVG save failed - check server logs',
      dataUrlLength: testSvgDataUrl.length
    });
    
  } catch (error) {
    console.error('[Test SVG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');