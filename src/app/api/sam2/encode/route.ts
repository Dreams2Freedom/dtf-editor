import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SAM2Service } from '@/services/sam2';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    let imageBuffer: Buffer = Buffer.from(arrayBuffer);

    // Convert WebP to PNG if needed (SAM2 works best with PNG)
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.format === 'webp') {
      imageBuffer = (await sharp(imageBuffer).png().toBuffer()) as Buffer;
    }

    // Call SAM2 encoder via Replicate
    const sam2 = new SAM2Service();

    if (!sam2.isAvailable()) {
      return NextResponse.json(
        { error: 'SAM2 service is not configured' },
        { status: 503 }
      );
    }

    const startTime = Date.now();
    const result = await sam2.encodeImage(imageBuffer);
    const processingTime = Date.now() - startTime;

    console.log('[SAM2 Encode] Success:', {
      userId: user.id,
      imageSize: result.imageSize,
      embeddingsLength: result.embeddings.length,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      embeddings: result.embeddings,
      shape: result.shape,
      imageSize: result.imageSize,
    });
  } catch (error) {
    console.error('[SAM2 Encode] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to encode image: ${message}` },
      { status: 500 }
    );
  }
}
