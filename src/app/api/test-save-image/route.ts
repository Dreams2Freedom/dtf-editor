import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Test saving a dummy image
    const testUrl = 'https://via.placeholder.com/500x500.png?text=Test+Image';

    const result = await saveProcessedImageToGallery({
      userId: user.id,
      processedUrl: testUrl,
      operationType: 'upscale',
      originalFilename: 'test_save.png',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: !!result,
      imageId: result,
      message: result ? 'Image saved successfully' : 'Failed to save image',
    });
  } catch (error) {
    console.error('[TestSaveImage] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');
