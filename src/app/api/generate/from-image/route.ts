import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { chatGPTService } from '@/services/chatgpt';
import { enhancePromptForDTF } from '@/utils/promptHelpers';
import { v4 as uuidv4 } from 'uuid';
import { withRateLimit } from '@/lib/rate-limit';

// Configure for Vercel
export const maxDuration = 60;
export const runtime = 'nodejs';

async function handlePost(request: NextRequest) {
  console.log('[Generate From Image API] Request received');

  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    // Get user profile
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check access
    const isAdmin = profile?.is_admin === true;
    const isPaidUser =
      profile?.subscription_tier && profile?.subscription_tier !== 'free';

    if (!isPaidUser && !isAdmin) {
      return NextResponse.json(
        {
          error: 'AI image generation is only available for paid subscribers',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Parse FormData instead of JSON
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const modifications =
      (formData.get('modifications') as string) || undefined;
    const size = (formData.get('size') as string) || '1024x1024';
    const quality = (formData.get('quality') as string) || 'standard';
    const style = (formData.get('style') as string) || 'vivid';
    const count = parseInt((formData.get('count') as string) || '1');

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert image file to base64 data URL for GPT-4o vision
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/png';
    const imageUrl = `data:${mimeType};base64,${base64}`;

    console.log(
      '[Generate From Image API] Step 1: Analyzing image with GPT-4o Vision...'
    );

    // Step 1: Analyze the image with GPT-4o Vision (GPT-4o can analyze images but not generate them)
    // GPT-4o has vision capabilities to understand and describe images
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a comprehensive prompt for analysis
    let analysisPrompt = `You are an expert at analyzing images for AI recreation. 
      Provide a detailed GPT-Image-1 prompt that will recreate this image as closely as possible.
      Focus on: exact text content and styling, colors, composition, art style, and all visual elements.
      The recreation must have a transparent background for DTF printing.`;

    if (modifications) {
      analysisPrompt += `
      
      IMPORTANT: Apply these modifications to your description:
      ${modifications}
      
      For text replacements, change the text but maintain the exact same style, font, colors, and positioning.
      For element removals, describe the image without those elements.
      For additions, include the new elements in your description.`;
    }

    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at creating detailed GPT-Image-1 prompts from images. Your prompts should be specific and comprehensive to ensure accurate recreation.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: analysisPrompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const generatedPrompt = visionResponse.choices[0]?.message?.content || '';

    // Enhance for DTF
    const enhancedPrompt = enhancePromptForDTF(generatedPrompt);

    console.log(
      '[Generate From Image API] Step 2: Generating image with GPT-Image-1...'
    );

    // Step 2: Generate the image with GPT-Image-1 (OpenAI's image generation model)
    // Note: GPT-4o can analyze images but cannot generate them - only GPT-Image-1 generates images
    const result = await chatGPTService.generateImage({
      prompt: enhancedPrompt,
      size,
      quality,
      style,
    });

    if (!result.success || !result.images) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Calculate and deduct credits
    const creditsPerImage = quality === 'hd' ? 2 : 1;
    const totalCreditsUsed = creditsPerImage * count;

    if (!isAdmin && profile) {
      await serviceClient
        .from('profiles')
        .update({ credits: (profile.credits || 0) - totalCreditsUsed })
        .eq('id', user.id);

      // Log transaction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: -totalCreditsUsed,
        type: 'usage',
        description: `AI image generation from reference (${quality} quality)`,
        metadata: {
          service: 'image-to-image',
          modifications,
          size,
          quality,
          style,
        },
      });
    }

    // Store generated images
    const storedImages = [];
    for (const image of result.images) {
      try {
        // Download and store the image
        const imageResponse = await fetch(image.url);
        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filename = `ai-generated/${user.id}/${uuidv4()}.png`;

        const { data: uploadData, error: uploadError } =
          await serviceClient.storage
            .from('user-uploads')
            .upload(filename, buffer, {
              contentType: 'image/png',
              upsert: false,
            });

        if (!uploadError) {
          const { data: urlData } = serviceClient.storage
            .from('user-uploads')
            .getPublicUrl(filename);

          // Save to processed_images via RPC so it appears in My Images (bypasses RLS/grant issues)
          const widthVal = parseInt(size.split('x')[0]);
          const heightVal = parseInt(size.split('x')[1]);
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
                source: 'image-to-image',
                modifications,
                prompt: enhancedPrompt,
                revised_prompt: image.revised_prompt,
                quality,
                style,
                model: 'gpt-image-1',
                operation: 'from-image',
                credits_used: creditsPerImage,
                width: widthVal,
                height: heightVal,
                storage_path: filename,
              },
            });

          if (recordError) {
            console.error('Error saving to processed_images:', recordError);
          }

          storedImages.push({
            url: urlData.publicUrl,
            id: insertedId || undefined,
            revised_prompt: image.revised_prompt,
          });
        }
      } catch (error) {
        console.error('Error storing generated image:', error);
      }
    }

    return NextResponse.json({
      success: true,
      images: storedImages,
      creditsUsed: totalCreditsUsed,
      creditsRemaining: profile
        ? (profile.credits || 0) - totalCreditsUsed
        : null,
      generatedPrompt: enhancedPrompt,
      analysis: generatedPrompt, // The original analysis before DTF enhancement
    });
  } catch (error: unknown) {
    console.error('[Generate From Image API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate image from reference',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'processing');
