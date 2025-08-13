import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { chatGPTService } from '@/services/chatgpt';
import { validatePrompt, enhancePromptForDTF } from '@/utils/promptHelpers';
import { v4 as uuidv4 } from 'uuid';

// Configure body size limit for Vercel
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('[Edit Image API] Request received at:', new Date().toISOString());
  
  try {
    // Get the authenticated user using the server Supabase client
    console.log('[Edit Image API] Creating Supabase client...');
    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (clientError) {
      console.error('[Edit Image API] Failed to create Supabase client:', clientError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize authentication',
          details: clientError instanceof Error ? clientError.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
    
    console.log('[Edit Image API] Getting user from session...');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Edit Image API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please log in', details: authError?.message },
        { status: 401 }
      );
    }
    
    console.log('[Edit Image API] User authenticated:', user.id);

    // Get user profile to check subscription status, credits, and admin status
    console.log('[Edit Image API] Fetching profile for user:', user.id);
    
    // Use service role client to bypass RLS for reading profile
    const serviceClient = createServiceRoleClient();
    
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Edit Image API] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      );
    }
    
    console.log('[Edit Image API] Profile fetched:', {
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
          error: 'AI image editing is only available for paid subscribers',
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;
    const maskFile = formData.get('mask') as File | null;
    const size = formData.get('size') as string || '1024x1024';
    const count = parseInt(formData.get('count') as string || '1');
    const enhanceForDTF = formData.get('enhanceForDTF') === 'true';

    if (!prompt || !imageFile) {
      return NextResponse.json(
        { error: 'Prompt and image are required' },
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

    // Calculate required credits for editing (fixed at 2 credits per edit)
    const creditsPerImage = 2;
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

    // Convert File to Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    let maskBuffer = null;
    if (maskFile) {
      maskBuffer = Buffer.from(await maskFile.arrayBuffer());
    }

    // Enhance prompt for DTF if requested
    const enhancedPrompt = enhanceForDTF
      ? enhancePromptForDTF(prompt)
      : prompt;

    console.log('[Edit Image API] Editing image:', {
      userId: user.id,
      prompt: enhancedPrompt.substring(0, 100) + '...',
      size,
      count,
      hasMask: !!maskBuffer,
      creditsRequired: totalCreditsRequired,
    });

    // Edit the image(s)
    console.log('[Edit Image API] Calling ChatGPT service...');
    let result;
    try {
      result = await chatGPTService.editImage({
        prompt: enhancedPrompt,
        image: imageBuffer,
        mask: maskBuffer,
        size: size as any,
        n: count,
      });
      console.log('[Edit Image API] ChatGPT service response:', { 
        success: result.success, 
        imageCount: result.images?.length 
      });
    } catch (serviceError) {
      console.error('[Edit Image API] ChatGPT service error:', serviceError);
      return NextResponse.json(
        { error: 'Image editing service error', details: serviceError instanceof Error ? serviceError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    if (!result.success || !result.images) {
      console.error('[Edit Image API] Image editing failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to edit image' },
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
      }

      // Log credit transaction
      await serviceClient.from('credit_transactions').insert({
        user_id: user.id,
        amount: -totalCreditsRequired,
        type: 'usage',
        description: `AI image editing (${size}, ${count} image${count > 1 ? 's' : ''})`,
        metadata: {
          service: 'chatgpt',
          prompt: enhancedPrompt.substring(0, 200),
          size,
          count,
          operation: 'edit',
        },
      });
    }

    // Store the edited images
    const storedImages = [];
    for (const image of result.images) {
      try {
        let buffer: Buffer;
        
        // Extract base64 data from data URL
        if (image.url.startsWith('data:')) {
          const base64Data = image.url.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          // Fetch from URL (fallback)
          const imageResponse = await fetch(image.url);
          const imageBlob = await imageResponse.blob();
          const arrayBuffer = await imageBlob.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }

        // Generate a unique filename
        const filename = `ai-edited/${user.id}/${uuidv4()}.png`;

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
        const widthVal = parseInt(size.split('x')[0]);
        const heightVal = parseInt(size.split('x')[1]);
        const { data: insertedId, error: recordError } = await serviceClient.rpc(
          'insert_processed_image',
          {
            p_user_id: user.id,
            p_original_filename: `ai-edited-${Date.now()}.png`,
            p_processed_filename: filename.split('/').pop() || filename,
            p_operation_type: 'generate',
            p_file_size: buffer.length,
            p_processing_status: 'completed',
            p_storage_url: urlData.publicUrl,
            p_thumbnail_url: urlData.publicUrl,
            p_metadata: {
              prompt: enhancedPrompt,
              size,
              model: 'gpt-image-1',
              operation: 'edit',
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
        });
      } catch (error) {
        console.error('Error storing edited image:', error);
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

  } catch (error) {
    console.error('[Edit Image API] Unexpected error:', error);
    console.error('[Edit Image API] Error stack:', error instanceof Error ? error.stack : undefined);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}