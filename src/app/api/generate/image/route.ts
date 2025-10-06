import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { chatGPTService } from '@/services/chatgpt';
import {
  validatePrompt,
  enhancePromptForDTF,
  enforceTransparentBackground,
} from '@/utils/promptHelpers';
import { v4 as uuidv4 } from 'uuid';
import { withRateLimit } from '@/lib/rate-limit';
import { Redis } from '@upstash/redis';
import { env } from '@/config/env';
import { deepImageService } from '@/services/deepImage';

// Configure timeout for Vercel - increased for high-quality image generation
// gpt-image-1 with quality='high' and background='transparent' can take 60-120 seconds
export const maxDuration = 300; // 5 minutes (Vercel Pro limit)
export const runtime = 'nodejs';

/**
 * Handle preview-to-download flow: Upscale a free preview to high-quality print-ready image
 * CRITICAL: Maintains transparency throughout the upscale process
 */
async function handlePreviewUpscale(
  previewId: string,
  user: any,
  profile: any,
  serviceClient: any,
  targetSize?: string,
  targetQuality?: string
): Promise<NextResponse> {
  console.log('[Generate Image API] Preview upscale requested:', { previewId, userId: user.id });

  try {
    // Initialize Redis
    let redis: Redis | null = null;
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      return NextResponse.json(
        { error: 'Preview service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get preview metadata from Redis
    const key = `preview:${user.id}:${previewId}`;
    const metadataStr = await redis.get(key);

    if (!metadataStr) {
      return NextResponse.json(
        { error: 'Preview not found or expired. Please generate a new preview.' },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(metadataStr as string);

    // Verify ownership
    if (metadata.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to preview' },
        { status: 403 }
      );
    }

    // Calculate upscaling credits required (based on target size/quality)
    // Upscaling costs less than generation: 1 credit for small, 2 for large
    const size = targetSize || metadata.size || '1024x1024';
    const isLargeSize = size === '1792x1024' || size === '1024x1792';
    const creditsRequired = isLargeSize ? 2 : 1;

    // Check if user is admin
    const isAdmin = Boolean(profile.is_admin);
    let creditsDeducted = false;

    // CRITICAL: Deduct credits BEFORE upscaling (admins exempt)
    if (!isAdmin) {
      console.log('[Generate Image API] Deducting credits for upscale:', {
        userId: user.id,
        amount: creditsRequired,
      });

      const { data: newBalance, error: deductError } = await serviceClient.rpc(
        'deduct_credits_atomic',
        {
          p_user_id: user.id,
          p_amount: creditsRequired,
        }
      );

      if (deductError || newBalance === null) {
        console.error('[Generate Image API] Credit deduction failed:', deductError);
        return NextResponse.json(
          {
            error: `Insufficient credits. You need ${creditsRequired} credits but only have ${profile.credits_remaining}`,
            creditsRequired,
            creditsAvailable: profile.credits_remaining,
          },
          { status: 402 }
        );
      }

      creditsDeducted = true;
      console.log('[Generate Image API] Credits deducted. New balance:', newBalance);

      // Log credit transaction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: -creditsRequired,
        type: 'usage',
        description: `AI preview upscale to high quality (${size})`,
        metadata: {
          service: 'deepimage',
          preview_id: previewId,
          size,
          operation: 'upscale_preview',
        },
      });
    }

    // Get the original unwatermarked image from storage
    const { data: imageData, error: downloadError } = await serviceClient.storage
      .from('ai-preview-originals')
      .download(metadata.originalPath);

    if (downloadError) {
      console.error('[Generate Image API] Failed to download original:', downloadError);

      // Refund credits on failure
      if (creditsDeducted) {
        await serviceClient.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_amount: creditsRequired,
        });
      }

      return NextResponse.json(
        { error: 'Failed to retrieve preview image' },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await imageData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get public URL for the preview (needed by Deep-Image.ai)
    // Upload to temporary location since Deep-Image needs HTTP URL
    const tempPath = `temp-upscale/${user.id}/${uuidv4()}.png`;
    const { error: tempUploadError } = await serviceClient.storage
      .from('user-uploads')
      .upload(tempPath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (tempUploadError) {
      console.error('[Generate Image API] Failed to upload temp:', tempUploadError);

      if (creditsDeducted) {
        await serviceClient.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_amount: creditsRequired,
        });
      }

      return NextResponse.json(
        { error: 'Failed to prepare image for upscaling' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: tempUrlData } = serviceClient.storage
      .from('user-uploads')
      .getPublicUrl(tempPath);

    // Upscale using Deep-Image.ai (CRITICAL: Preserves PNG transparency)
    console.log('[Generate Image API] Upscaling preview with Deep-Image...');
    const upscaleResult = await deepImageService.upscaleImage(tempUrlData.publicUrl, {
      scale: 4, // 4x upscale for maximum quality
      processingMode: 'generative_upscale', // Best quality for print
      faceEnhance: false,
    });

    // Clean up temp file
    await serviceClient.storage.from('user-uploads').remove([tempPath]);

    if (upscaleResult.status === 'error') {
      console.error('[Generate Image API] Upscale failed:', upscaleResult.error);

      if (creditsDeducted) {
        await serviceClient.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_amount: creditsRequired,
        });
      }

      return NextResponse.json(
        { error: upscaleResult.error || 'Failed to upscale image' },
        { status: 500 }
      );
    }

    // Download upscaled image
    const upscaledResponse = await fetch(upscaleResult.url!);
    const upscaledBlob = await upscaledResponse.blob();
    const upscaledArrayBuffer = await upscaledBlob.arrayBuffer();
    const upscaledBuffer = Buffer.from(upscaledArrayBuffer);

    // Store the high-quality upscaled image
    const filename = `ai-upscaled/${user.id}/${uuidv4()}.png`;
    const { error: uploadError } = await serviceClient.storage
      .from('user-uploads')
      .upload(filename, upscaledBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Generate Image API] Upload error:', uploadError);

      if (creditsDeducted) {
        await serviceClient.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_amount: creditsRequired,
        });
      }

      return NextResponse.json(
        { error: 'Failed to store upscaled image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from('user-uploads')
      .getPublicUrl(filename);

    // Save to processed_images
    const widthVal = 4096; // 4x upscale from 1024
    const heightVal = 4096;
    const { data: insertedId, error: recordError } = await serviceClient.rpc(
      'insert_processed_image',
      {
        p_user_id: user.id,
        p_original_filename: `ai-upscaled-${Date.now()}.png`,
        p_processed_filename: filename.split('/').pop() || filename,
        p_operation_type: 'upscale',
        p_file_size: upscaledBuffer.length,
        p_processing_status: 'completed',
        p_storage_url: urlData.publicUrl,
        p_thumbnail_url: urlData.publicUrl,
        p_metadata: {
          source: 'ai_preview',
          preview_id: previewId,
          original_prompt: metadata.prompt,
          upscale_factor: 4,
          credits_used: creditsRequired,
          width: widthVal,
          height: heightVal,
          storage_path: filename,
          has_transparency: true,
        },
      }
    );

    if (recordError) {
      console.error('[Generate Image API] Record error:', recordError);
    }

    // CLEANUP: Delete both preview files and metadata
    console.log('[Generate Image API] Cleaning up preview files...');
    await serviceClient.storage
      .from('ai-preview-originals')
      .remove([metadata.originalPath]);
    await serviceClient.storage
      .from('ai-preview-watermarked')
      .remove([metadata.watermarkedPath]);
    await redis.del(key);

    // Get updated credit balance
    const { data: updatedProfile } = await serviceClient
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    console.log('[Generate Image API] Preview upscale completed successfully');

    return NextResponse.json({
      success: true,
      images: [
        {
          url: urlData.publicUrl,
          id: insertedId || undefined,
        },
      ],
      creditsUsed: creditsRequired,
      creditsRemaining: updatedProfile?.credits_remaining || 0,
      message: 'Preview upscaled to high-quality print-ready image',
    });
  } catch (error: any) {
    console.error('[Generate Image API] Preview upscale error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to upscale preview',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  console.log(
    '[Generate Image API] Request received at:',
    new Date().toISOString()
  );

  try {
    // Get the authenticated user using the server Supabase client
    console.log('[Generate Image API] Creating Supabase client...');
    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (clientError: any) {
      console.error(
        '[Generate Image API] Failed to create Supabase client:',
        clientError
      );
      return NextResponse.json(
        {
          error: 'Failed to initialize authentication',
          details: clientError.message,
        },
        { status: 500 }
      );
    }

    console.log('[Generate Image API] Getting user from session...');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Generate Image API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please log in', details: authError?.message },
        { status: 401 }
      );
    }

    console.log('[Generate Image API] User authenticated:', user.id);

    // Get user profile to check subscription status, credits, and admin status
    console.log('[Generate Image API] Fetching profile for user:', user.id);

    // Use service role client to bypass RLS for reading profile
    const serviceClient = createServiceRoleClient();

    // Try to get profile with all fields first
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(
        '[Generate Image API] Error fetching profile:',
        profileError
      );
      console.error('[Generate Image API] Profile error details:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });

      // Try to create a basic profile if it doesn't exist
      if (profileError.code === 'PGRST116') {
        // Row not found
        console.log(
          '[Generate Image API] Profile not found, creating default profile'
        );
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            credits_remaining: 0,
            subscription_tier: 'free',
            is_admin: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error(
            '[Generate Image API] Failed to create profile:',
            insertError
          );
          return NextResponse.json(
            {
              error: 'Failed to create user profile',
              details: insertError.message,
            },
            { status: 500 }
          );
        }

        // Use the newly created profile
        Object.assign(profile || {}, newProfile);
      } else {
        return NextResponse.json(
          {
            error: 'Failed to fetch user profile',
            details: profileError.message,
          },
          { status: 500 }
        );
      }
    }

    console.log('[Generate Image API] Profile fetched:', {
      id: profile?.id,
      credits: profile?.credits_remaining,
      is_admin: profile?.is_admin,
      subscription_tier: profile?.subscription_tier,
    });

    // Check if user has access (must be paid user or admin)
    // Use Boolean() to safely handle any truthy value (true, 1, 'true', etc.)
    const isAdmin = Boolean(profile.is_admin);
    const isPaidUser =
      profile.subscription_tier && profile.subscription_tier !== 'free';

    // BETA: Temporarily allow all users to test AI image generation
    // TODO: Re-enable paid check before production launch
    // if (!isPaidUser && !isAdmin) {
    //   return NextResponse.json(
    //     {
    //       error: 'AI image generation is only available for paid subscribers',
    //       requiresUpgrade: true,
    //     },
    //     { status: 403 }
    //   );
    // }

    // Parse request body
    const body = await request.json();
    const { prompt, size, quality, style, count = 1, previewId } = body;

    // PREVIEW-TO-DOWNLOAD FLOW: If previewId is provided, upscale the preview instead of generating new
    if (previewId) {
      return await handlePreviewUpscale(previewId, user, profile, serviceClient, size, quality);
    }

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

    // Map UI quality values to gpt-image-1 API values
    // UI may send: 'standard' or 'hd' (legacy), but gpt-image-1 needs: 'low', 'medium', 'high', 'auto'
    const qualityMapping: Record<string, 'low' | 'medium' | 'high' | 'auto'> = {
      standard: 'medium', // Map standard to medium
      hd: 'high', // Map hd to high
      low: 'low',
      medium: 'medium',
      high: 'high',
      auto: 'auto',
    };
    const apiQuality = qualityMapping[quality] || 'medium';

    // Calculate required credits based on quality for gpt-image-1
    // Beta pricing: reduced credit costs
    const creditCosts: Record<string, number> = {
      low: 1,
      medium: 1,
      high: 2,
      auto: 1,
    };
    const creditsPerImage = creditCosts[apiQuality] || 1;
    const totalCreditsRequired = creditsPerImage * count;

    // CRITICAL: Deduct credits BEFORE generation to prevent race conditions
    // Use atomic database function to ensure only one request can deduct credits at a time
    // This is only for non-admin users
    let creditsDeducted = false;
    if (!isAdmin) {
      console.log('[Generate Image API] Atomically deducting credits:', {
        userId: user.id,
        amount: totalCreditsRequired,
        currentCredits: profile.credits_remaining,
      });

      const { data: newBalance, error: deductError } = await serviceClient.rpc(
        'deduct_credits_atomic',
        {
          p_user_id: user.id,
          p_amount: totalCreditsRequired,
        }
      );

      if (deductError || newBalance === null) {
        // Deduction failed - user doesn't have enough credits
        console.error(
          '[Generate Image API] Credit deduction failed:',
          deductError
        );
        return NextResponse.json(
          {
            error: `Insufficient credits. You need ${totalCreditsRequired} credits but only have ${profile.credits_remaining}`,
            creditsRequired: totalCreditsRequired,
            creditsAvailable: profile.credits_remaining,
          },
          { status: 402 } // Payment Required
        );
      }

      creditsDeducted = true;
      console.log(
        '[Generate Image API] Credits deducted successfully. New balance:',
        newBalance
      );

      // Log credit transaction immediately after deduction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: -totalCreditsRequired,
        type: 'usage',
        description: `AI image generation (${quality} quality, ${count} image${count > 1 ? 's' : ''})`,
        metadata: {
          service: 'chatgpt',
          prompt: prompt.substring(0, 200),
          size,
          quality,
          style,
          count,
        },
      });
    }

    // Enhance prompt for DTF if requested
    const enhancedPrompt = body.enhanceForDTF
      ? enhancePromptForDTF(prompt)
      : prompt;

    // CRITICAL: ALWAYS enforce transparent background - this is the final gate
    // This ensures 100% of images have transparent backgrounds for DTF printing
    const finalPrompt = enforceTransparentBackground(enhancedPrompt);

    console.log('[Generate Image API] Generating AI image:', {
      userId: user.id,
      prompt: finalPrompt.substring(0, 100) + '...',
      size,
      quality: apiQuality, // Using mapped quality value
      count,
      creditsRequired: totalCreditsRequired,
      creditsDeducted,
      transparentBgEnforced: true,
    });

    // Generate the image(s)
    console.log('[Generate Image API] Calling ChatGPT service...');
    let result;
    try {
      result =
        count > 1
          ? await chatGPTService.generateMultipleImages(
              { prompt: finalPrompt, size, quality: apiQuality },
              count
            )
          : await chatGPTService.generateImage({
              prompt: finalPrompt,
              size,
              quality: apiQuality,
            });
      console.log('[Generate Image API] ChatGPT service response:', {
        success: result.success,
        imageCount: result.images?.length,
      });
    } catch (serviceError: any) {
      console.error(
        '[Generate Image API] ChatGPT service error:',
        serviceError
      );

      // CRITICAL: Refund credits if generation failed
      if (creditsDeducted) {
        console.log(
          '[Generate Image API] Refunding credits due to generation failure...'
        );
        await serviceClient.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_amount: totalCreditsRequired,
        });

        // Log refund transaction
        await serviceClient.from('credit_transactions').insert({
          user_id: user.id,
          amount: totalCreditsRequired,
          type: 'refund',
          description: `Credit refund - image generation failed: ${serviceError.message}`,
          metadata: {
            service: 'chatgpt',
            error: serviceError.message,
          },
        });
      }

      return NextResponse.json(
        {
          error: 'Image generation service error',
          details: serviceError.message,
        },
        { status: 500 }
      );
    }

    if (!result.success || !result.images) {
      console.error(
        '[Generate Image API] Image generation failed:',
        result.error
      );

      // CRITICAL: Refund credits if generation failed
      if (creditsDeducted) {
        console.log(
          '[Generate Image API] Refunding credits due to generation failure...'
        );
        await serviceClient.rpc('refund_credits_atomic', {
          p_user_id: user.id,
          p_amount: totalCreditsRequired,
        });

        // Log refund transaction
        await serviceClient.from('credit_transactions').insert({
          user_id: user.id,
          amount: totalCreditsRequired,
          type: 'refund',
          description: `Credit refund - image generation failed: ${result.error}`,
          metadata: {
            service: 'chatgpt',
            error: result.error,
          },
        });
      }

      return NextResponse.json(
        { error: result.error || 'Failed to generate image' },
        { status: 500 }
      );
    }

    // serviceClient already initialized above for profile operations

    // Download and store the generated images
    const storedImages = [];
    for (const image of result.images) {
      try {
        let buffer: Buffer;

        // Check if the image is a base64 data URL or a regular URL
        if (image.url.startsWith('data:')) {
          // Extract base64 data from data URL
          const base64Data = image.url.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          // Fetch from URL (fallback for URL response format)
          const imageResponse = await fetch(image.url);
          const imageBlob = await imageResponse.blob();
          const arrayBuffer = await imageBlob.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }

        // Generate a unique filename
        const filename = `ai-generated/${user.id}/${uuidv4()}.png`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } =
          await serviceClient.storage
            .from('user-uploads')
            .upload(filename, buffer, {
              contentType: 'image/png',
              upsert: false,
            });

        if (uploadError) {
          console.error('Error uploading to storage:', uploadError);
          continue;
        }

        // Get the public URL
        const { data: urlData } = serviceClient.storage
          .from('user-uploads')
          .getPublicUrl(filename);

        // Save to processed_images via RPC so it appears in My Images (bypasses RLS/grant issues)
        const widthVal = size?.split('x')[0]
          ? parseInt(size.split('x')[0])
          : 1024;
        const heightVal = size?.split('x')[1]
          ? parseInt(size.split('x')[1])
          : 1024;
        const { data: insertedId, error: recordError } =
          await serviceClient.rpc('insert_processed_image', {
            p_user_id: user.id,
            p_original_filename: `ai-generated-${Date.now()}.png`,
            p_processed_filename: filename.split('/').pop() || filename,
            p_operation_type: 'generate',
            p_file_size: buffer.length,
            p_processing_status: 'completed',
            p_storage_url: urlData.publicUrl,
            p_thumbnail_url: urlData.publicUrl,
            p_metadata: {
              prompt: enhancedPrompt,
              revised_prompt: image.revised_prompt,
              quality,
              style,
              model: 'gpt-image-1',
              credits_used: creditsPerImage,
              width: widthVal,
              height: heightVal,
              storage_path: filename,
            },
          });

        if (recordError) {
          console.error('Error saving upload record:', recordError);
        }

        storedImages.push({
          url: urlData.publicUrl,
          id: insertedId || undefined,
          revised_prompt: image.revised_prompt,
        });
      } catch (error) {
        console.error('Error storing generated image:', error);
      }
    }

    // CRITICAL: If NO images were stored successfully, refund credits
    if (storedImages.length === 0 && creditsDeducted) {
      console.log(
        '[Generate Image API] No images were stored. Refunding credits...'
      );
      await serviceClient.rpc('refund_credits_atomic', {
        p_user_id: user.id,
        p_amount: totalCreditsRequired,
      });

      // Log refund transaction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: totalCreditsRequired,
        type: 'refund',
        description: 'Credit refund - all image storage operations failed',
        metadata: {
          service: 'chatgpt',
          attempted_count: result.images.length,
        },
      });

      return NextResponse.json(
        {
          error:
            'Failed to store generated images. Credits have been refunded.',
        },
        { status: 500 }
      );
    }

    // Calculate actual credits used based on successfully stored images
    // If some images failed to store, only charge for what was successfully stored
    const actualCreditsUsed = storedImages.length * creditsPerImage;
    const creditsToRefund = totalCreditsRequired - actualCreditsUsed;

    // If we charged for more images than we successfully stored, refund the difference
    if (creditsToRefund > 0 && creditsDeducted) {
      console.log('[Generate Image API] Refunding credits for failed images:', {
        total: totalCreditsRequired,
        successful: actualCreditsUsed,
        refund: creditsToRefund,
      });

      await serviceClient.rpc('refund_credits_atomic', {
        p_user_id: user.id,
        p_amount: creditsToRefund,
      });

      // Log partial refund transaction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: creditsToRefund,
        type: 'refund',
        description: `Partial credit refund - ${result.images.length - storedImages.length} of ${result.images.length} images failed to store`,
        metadata: {
          service: 'chatgpt',
          requested_count: result.images.length,
          successful_count: storedImages.length,
        },
      });
    }

    // Get updated credit balance
    const { data: updatedProfile } = await serviceClient
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    // Return success response
    return NextResponse.json({
      success: true,
      images: storedImages,
      creditsUsed: actualCreditsUsed,
      creditsRemaining: updatedProfile?.credits_remaining || 0,
      enhancedPrompt: enhancedPrompt !== prompt ? enhancedPrompt : undefined,
    });
  } catch (error: any) {
    console.error('[Generate Image API] Unexpected error:', error);
    console.error('[Generate Image API] Error stack:', error.stack);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'processing');
