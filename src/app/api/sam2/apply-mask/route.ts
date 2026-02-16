import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { ApiCostTracker } from '@/lib/api-cost-tracker';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Monthly free-tier limit for background removal */
const FREE_TIER_MONTHLY_LIMIT = 2;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
    const {
      imageUrl,
      mask: maskBase64,
      maskWidth,
      maskHeight,
      featherRadius = 0,
    } = body as {
      imageUrl: string;
      mask: string;
      maskWidth: number;
      maskHeight: number;
      featherRadius?: number;
    };

    if (!imageUrl || !maskBase64 || !maskWidth || !maskHeight) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: imageUrl, mask, maskWidth, maskHeight',
        },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Check user plan and credit limits
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('subscription_plan, is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const isPaid = ['basic', 'starter', 'professional'].includes(
      profile.subscription_plan || ''
    );
    const isAdmin = profile.is_admin === true;

    // Free users: check monthly usage
    if (!isPaid && !isAdmin) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: countError } = await serviceClient
        .from('processed_images')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('operation_type', 'background-removal')
        .gte('created_at', startOfMonth.toISOString());

      if (countError) {
        console.error('[SAM2 Apply] Error checking usage:', countError);
      }

      if ((count || 0) >= FREE_TIER_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Monthly background removal limit reached (${FREE_TIER_MONTHLY_LIMIT} free per month). Upgrade to a paid plan for unlimited access.`,
          },
          { status: 402 }
        );
      }
    }

    // Download the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download original image' },
        { status: 400 }
      );
    }
    const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Get original image dimensions
    const originalMeta = await sharp(originalBuffer).metadata();
    const originalWidth = originalMeta.width || maskWidth;
    const originalHeight = originalMeta.height || maskHeight;

    // Decode the mask from base64 (1 byte per pixel alpha channel)
    const maskBytes = Buffer.from(maskBase64, 'base64');

    // Create a grayscale mask image at mask dimensions
    const maskImage = sharp(maskBytes, {
      raw: {
        width: maskWidth,
        height: maskHeight,
        channels: 1,
      },
    });

    // Resize mask to original image dimensions
    let resizedMask = await maskImage
      .resize(originalWidth, originalHeight, {
        kernel: 'nearest', // Nearest-neighbor for binary mask
      })
      .toBuffer();

    // Apply feathering (Gaussian blur) if requested
    if (featherRadius > 0) {
      const sigma = featherRadius * 0.75;
      resizedMask = await sharp(resizedMask, {
        raw: { width: originalWidth, height: originalHeight, channels: 1 },
      })
        .blur(sigma)
        .toBuffer();
    }

    // Apply mask as alpha channel to original image
    const result = await sharp(originalBuffer)
      .ensureAlpha()
      .composite([
        {
          input: resizedMask,
          blend: 'dest-in',
          raw: {
            width: originalWidth,
            height: originalHeight,
            channels: 1,
          },
        },
      ])
      .png()
      .toBuffer();

    // Auto-trim transparent pixels
    const trimmed = await sharp(result)
      .trim({ threshold: 0 })
      .withMetadata({ density: 300 }) // 300 DPI for print-ready output
      .png({ compressionLevel: 6 })
      .toBuffer();

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const filename = `sam2_${timestamp}.png`;
    const storagePath = `${user.id}/processed/${filename}`;

    const { error: uploadError } = await serviceClient.storage
      .from('images')
      .upload(storagePath, trimmed, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    let savedImageId: string | null = null;

    if (uploadError) {
      console.error('[SAM2 Apply] Storage upload error:', uploadError);
    } else {
      // Get public URL
      const {
        data: { publicUrl },
      } = serviceClient.storage.from('images').getPublicUrl(storagePath);

      // Save to processed_images table
      const { data: processedImageId, error: saveError } =
        await serviceClient.rpc('insert_processed_image', {
          p_user_id: user.id,
          p_original_filename: `background_removal_${timestamp}.png`,
          p_processed_filename: filename,
          p_operation_type: 'background-removal',
          p_file_size: trimmed.byteLength,
          p_processing_status: 'completed',
          p_storage_url: publicUrl,
          p_thumbnail_url: publicUrl,
          p_metadata: {
            credits_used: isPaid || isAdmin ? 0 : 1,
            processing_time_ms: Date.now() - startTime,
            api_used: 'SAM2-Replicate',
            feather_radius: featherRadius,
            original_dimensions: {
              width: originalWidth,
              height: originalHeight,
            },
            storage_path: storagePath,
          },
        });

      if (saveError) {
        console.error('[SAM2 Apply] Failed to save to gallery:', saveError);
      } else {
        savedImageId = processedImageId;
      }
    }

    // Track API cost
    await ApiCostTracker.logUsage({
      userId: user.id,
      provider: 'replicate',
      operation: 'background_removal',
      status: 'success',
      creditsCharged: isPaid || isAdmin ? 0 : 1,
      userPlan: profile.subscription_plan || 'free',
      processingTimeMs: Date.now() - startTime,
    }).catch(err => console.error('[SAM2 Apply] Cost tracking error:', err));

    // Return the processed image
    return new NextResponse(trimmed, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': trimmed.byteLength.toString(),
        'X-Image-Id': savedImageId || '',
        'X-Storage-Path': storagePath,
      },
    });
  } catch (error) {
    console.error('[SAM2 Apply] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to apply mask: ${message}` },
      { status: 500 }
    );
  }
}
