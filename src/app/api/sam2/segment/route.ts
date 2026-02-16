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

    // Parse request body
    const body = await request.json();
    const { imageUrl } = body as { imageUrl: string };

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const service = new SAM2Service();

    if (!service.isAvailable()) {
      return NextResponse.json(
        { error: 'Background removal service is not configured' },
        { status: 503 }
      );
    }

    // Download image from URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download image' },
        { status: 400 }
      );
    }
    let imageBuffer: Buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Convert WebP to PNG if needed
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.format === 'webp') {
      imageBuffer = (await sharp(imageBuffer).png().toBuffer()) as Buffer;
    }

    const startTime = Date.now();

    // Call BiRefNet background removal via Replicate
    const result = await service.removeBackground(imageBuffer);
    const processingTime = Date.now() - startTime;

    // Download the result (transparent PNG) and extract the mask
    const resultBuffer = await service.downloadImage(result.outputUrl);

    // Extract the alpha channel as a white/black mask PNG
    const maskPng = await sharp(resultBuffer)
      .extractChannel('alpha')
      .toColourspace('b-w')
      .png()
      .toBuffer();

    const maskBase64 = `data:image/png;base64,${maskPng.toString('base64')}`;

    console.log('[BG Removal] Success:', {
      userId: user.id,
      imageSize: result.imageSize,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      maskBase64,
      imageSize: result.imageSize,
    });
  } catch (error) {
    console.error('[BG Removal] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Background removal failed: ${message}` },
      { status: 500 }
    );
  }
}
