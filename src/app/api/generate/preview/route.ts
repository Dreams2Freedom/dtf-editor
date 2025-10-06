import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { chatGPTService } from '@/services/chatgpt';
import {
  validatePrompt,
  enforceTransparentBackground,
} from '@/utils/promptHelpers';
import { addWatermark } from '@/utils/watermark';
import { v4 as uuidv4 } from 'uuid';
import { withRateLimit } from '@/lib/rate-limit';
import { Redis } from '@upstash/redis';
import { env } from '@/config/env';

// Configure timeout for Vercel
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

/**
 * Preview Generation API
 * Generates FREE low-quality watermarked previews without charging credits
 * Stores both watermarked (public) and original (private) versions for later upscaling
 */
async function handlePost(request: NextRequest) {
  console.log('[Preview API] Request received at:', new Date().toISOString());

  try {
    // Initialize Redis for preview metadata storage
    let redis: Redis | null = null;
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      console.warn(
        '[Preview API] Redis not configured - previews will not be stored'
      );
      return NextResponse.json(
        { error: 'Preview service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Preview API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    console.log('[Preview API] User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    // CRITICAL: ALWAYS enforce transparent background
    const finalPrompt = enforceTransparentBackground(prompt);

    console.log('[Preview API] Generating FREE preview:', {
      userId: user.id,
      prompt: finalPrompt.substring(0, 100) + '...',
      size,
      quality: 'low',
    });

    // Generate LOW-quality image (no credit charge)
    const result = await chatGPTService.generateImage({
      prompt: finalPrompt,
      size,
      quality: 'low', // ALWAYS use low quality for free previews
      n: 1,
    });

    if (!result.success || !result.images || result.images.length === 0) {
      console.error('[Preview API] Generation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to generate preview' },
        { status: 500 }
      );
    }

    const image = result.images[0];

    // Convert image to buffer
    let imageBuffer: Buffer;
    if (image.url.startsWith('data:')) {
      const base64Data = image.url.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      const imageResponse = await fetch(image.url);
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Generate unique preview ID
    const previewId = uuidv4();
    const timestamp = Date.now();

    // Create watermarked version
    console.log('[Preview API] Adding watermark...');
    const watermarkedBuffer = await addWatermark(imageBuffer);

    // Store both versions in Supabase Storage
    const serviceClient = createServiceRoleClient();

    // 1. Store ORIGINAL (unwatermarked) in private bucket
    const originalPath = `ai-preview-originals/${user.id}/${previewId}.png`;
    const { error: originalUploadError } = await serviceClient.storage
      .from('ai-preview-originals')
      .upload(originalPath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (originalUploadError) {
      console.error(
        '[Preview API] Failed to upload original:',
        originalUploadError
      );
      return NextResponse.json(
        { error: 'Failed to store preview image' },
        { status: 500 }
      );
    }

    // 2. Store WATERMARKED in public bucket
    const watermarkedPath = `ai-preview-watermarked/${user.id}/${previewId}.png`;
    const { error: watermarkedUploadError } = await serviceClient.storage
      .from('ai-preview-watermarked')
      .upload(watermarkedPath, watermarkedBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (watermarkedUploadError) {
      console.error(
        '[Preview API] Failed to upload watermarked:',
        watermarkedUploadError
      );
      // Cleanup original
      await serviceClient.storage
        .from('ai-preview-originals')
        .remove([originalPath]);
      return NextResponse.json(
        { error: 'Failed to store preview image' },
        { status: 500 }
      );
    }

    // Get public URL for watermarked image
    const { data: watermarkedUrlData } = serviceClient.storage
      .from('ai-preview-watermarked')
      .getPublicUrl(watermarkedPath);

    // Save metadata to Redis with 1-hour TTL
    const metadata = {
      userId: user.id,
      previewId,
      originalPath,
      watermarkedPath,
      prompt: finalPrompt,
      size,
      createdAt: timestamp,
      expiresAt: timestamp + 3600000, // 1 hour from now
    };

    await redis.set(
      `preview:${user.id}:${previewId}`,
      JSON.stringify(metadata),
      { ex: 3600 } // Auto-expire in 1 hour
    );

    console.log('[Preview API] Preview created successfully:', {
      previewId,
      watermarkedUrl: watermarkedUrlData.publicUrl,
    });

    // Return watermarked URL only (never expose original)
    return NextResponse.json({
      success: true,
      previewId,
      watermarkedUrl: watermarkedUrlData.publicUrl,
      expiresIn: 3600, // seconds
      message: 'Preview generated! No credits charged.',
    });
  } catch (error: any) {
    console.error('[Preview API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        // Stack trace logged to console, not exposed to client in production
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting (15 previews per 5 minutes)
export const POST = withRateLimit(handlePost, 'aiPreview');
