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
    const { imageUrl, points } = body as {
      imageUrl: string;
      points?: { x: number; y: number; label: 0 | 1 }[];
    };

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const sam2 = new SAM2Service();

    if (!sam2.isAvailable()) {
      return NextResponse.json(
        { error: 'SAM2 service is not configured' },
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

    // If no points, use center point for auto-segmentation
    const segmentPoints =
      points && points.length > 0
        ? points
        : [{ x: 0.5, y: 0.5, label: 1 as const }];

    const startTime = Date.now();

    // Call SAM2 segment via Replicate
    const result = await sam2.segment(imageBuffer, segmentPoints);
    const processingTime = Date.now() - startTime;

    if (!result.combinedMaskUrl) {
      return NextResponse.json(
        { error: 'No mask returned from SAM2' },
        { status: 500 }
      );
    }

    // Download the mask and convert to base64 PNG
    const maskBuffer = await sam2.downloadMask(result.combinedMaskUrl);
    const maskPng = await sharp(maskBuffer).png().toBuffer();
    const maskBase64 = `data:image/png;base64,${maskPng.toString('base64')}`;

    console.log('[SAM2 Segment] Success:', {
      userId: user.id,
      imageSize: result.imageSize,
      pointCount: segmentPoints.length,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      maskBase64,
      imageSize: result.imageSize,
    });
  } catch (error) {
    console.error('[SAM2 Segment] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Segmentation failed: ${message}` },
      { status: 500 }
    );
  }
}
