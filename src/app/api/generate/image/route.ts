import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { chatGPTService } from '@/services/chatgpt';
import { validatePrompt, enhancePromptForDTF } from '@/utils/promptHelpers';
import { v4 as uuidv4 } from 'uuid';

// Configure body size limit for Vercel
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('[Generate Image API] Request received at:', new Date().toISOString());
  
  try {
    // Get the authenticated user using the server Supabase client
    console.log('[Generate Image API] Creating Supabase client...');
    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (clientError: any) {
      console.error('[Generate Image API] Failed to create Supabase client:', clientError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize authentication',
          details: clientError.message 
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
      console.error('[Generate Image API] Error fetching profile:', profileError);
      console.error('[Generate Image API] Profile error details:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      });
      
      // Try to create a basic profile if it doesn't exist
      if (profileError.code === 'PGRST116') { // Row not found
        console.log('[Generate Image API] Profile not found, creating default profile');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            credits: 0,
            subscription_tier: 'free',
            is_admin: false
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('[Generate Image API] Failed to create profile:', insertError);
          return NextResponse.json(
            { error: 'Failed to create user profile', details: insertError.message },
            { status: 500 }
          );
        }
        
        // Use the newly created profile
        Object.assign(profile || {}, newProfile);
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch user profile', details: profileError.message },
          { status: 500 }
        );
      }
    }
    
    console.log('[Generate Image API] Profile fetched:', {
      id: profile?.id,
      credits: profile?.credits,
      is_admin: profile?.is_admin,
      subscription_tier: profile?.subscription_tier
    });

    // Check if user has access (must be paid user or admin)
    const isAdmin = profile.is_admin === true;
    const isPaidUser = profile.subscription_tier && profile.subscription_tier !== 'free';
    
    if (!isPaidUser && !isAdmin) {
      return NextResponse.json(
        { 
          error: 'AI image generation is only available for paid subscribers',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prompt, size, quality, style, count = 1 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }

    // Calculate required credits based on quality for gpt-image-1
    const qualityMap = {
      'low': 1,
      'standard': 2,
      'high': 3,
      'hd': 3, // Map hd to high for backwards compatibility
    };
    const creditsPerImage = qualityMap[quality] || 2;
    const totalCreditsRequired = creditsPerImage * count;

    // Check if user has enough credits (skip for admins)
    if (!isAdmin && profile.credits < totalCreditsRequired) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. You need ${totalCreditsRequired} credits but only have ${profile.credits}`,
          creditsRequired: totalCreditsRequired,
          creditsAvailable: profile.credits,
        },
        { status: 402 } // Payment Required
      );
    }

    // Enhance prompt for DTF if requested
    const enhancedPrompt = body.enhanceForDTF 
      ? enhancePromptForDTF(prompt)
      : prompt;

    console.log('[Generate Image API] Generating AI image:', {
      userId: user.id,
      prompt: enhancedPrompt.substring(0, 100) + '...',
      size,
      quality,
      style,
      count,
      creditsRequired: totalCreditsRequired,
    });

    // Generate the image(s)
    console.log('[Generate Image API] Calling ChatGPT service...');
    let result;
    try {
      result = count > 1
        ? await chatGPTService.generateMultipleImages(
            { prompt: enhancedPrompt, size, quality, style },
            count
          )
        : await chatGPTService.generateImage({
            prompt: enhancedPrompt,
            size,
            quality,
            style,
          });
      console.log('[Generate Image API] ChatGPT service response:', { success: result.success, imageCount: result.images?.length });
    } catch (serviceError: any) {
      console.error('[Generate Image API] ChatGPT service error:', serviceError);
      return NextResponse.json(
        { error: 'Image generation service error', details: serviceError.message },
        { status: 500 }
      );
    }

    if (!result.success || !result.images) {
      console.error('[Generate Image API] Image generation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Deduct credits (skip for admins)
    if (!isAdmin) {
      const { error: creditError } = await serviceClient
        .from('profiles')
        .update({ credits: profile.credits - totalCreditsRequired })
        .eq('id', user.id);

      if (creditError) {
        console.error('Error deducting credits:', creditError);
        // Image was generated but credits couldn't be deducted
        // Still return the image but log the error
      }

      // Log credit transaction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: -totalCreditsRequired,
        type: 'usage',
        description: `AI image generation (${quality} quality, ${count} image${count > 1 ? 's' : ''})`,
        metadata: {
          service: 'chatgpt',
          prompt: enhancedPrompt.substring(0, 200),
          size,
          quality,
          style,
          count,
        },
      });
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
        const { data: uploadData, error: uploadError } = await serviceClient.storage
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
        const widthVal = size?.split('x')[0] ? parseInt(size.split('x')[0]) : 1024;
        const heightVal = size?.split('x')[1] ? parseInt(size.split('x')[1]) : 1024;
        const { data: insertedId, error: recordError } = await serviceClient.rpc(
          'insert_processed_image',
          {
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
              storage_path: filename
            }
          }
        );

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

    // Return success response
    return NextResponse.json({
      success: true,
      images: storedImages,
      creditsUsed: totalCreditsRequired,
      creditsRemaining: profile.credits - totalCreditsRequired,
      enhancedPrompt: enhancedPrompt !== prompt ? enhancedPrompt : undefined,
    });

  } catch (error: any) {
    console.error('[Generate Image API] Unexpected error:', error);
    console.error('[Generate Image API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}