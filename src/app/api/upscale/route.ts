import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { imageProcessingService } from '@/services/imageProcessing';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ProcessingMode } from '@/services/deepImage';
import { env } from '@/config/env';
// Import save function
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  console.log('[Upscale] Handler started - v2 with gallery save');
  
  // Set a timeout for the entire request (55 seconds, leaving 5s buffer for Vercel's 60s limit)
  // This ensures we return a proper JSON error before Vercel times out
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout after 55 seconds')), 55000);
  });
  
  try {
    // 1. Get current user using server-side Supabase client
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const imageUrl = formData.get('imageUrl') as string;
    const processingMode = (formData.get('processingMode') as ProcessingMode) || 'auto_enhance';
    const scale = formData.get('scale') ? parseInt(formData.get('scale') as string) : undefined;
    const targetWidth = formData.get('targetWidth') ? parseInt(formData.get('targetWidth') as string) : undefined;
    const targetHeight = formData.get('targetHeight') ? parseInt(formData.get('targetHeight') as string) : undefined;

    let finalImageUrl: string;

    // 3. Handle file upload if provided
    if (imageFile) {
      // Upload image to Supabase Storage
      const uploadResult = await storageService.uploadFile(imageFile);
      
      if (!uploadResult.success || !uploadResult.url) {
        return NextResponse.json(
          { error: uploadResult.error || 'Failed to upload image' },
          { status: 500 }
        );
      }

      finalImageUrl = uploadResult.url;
    } else if (imageUrl) {
      // Use the provided image URL directly
      finalImageUrl = imageUrl;
    } else {
      return NextResponse.json({ error: 'No image file or URL provided' }, { status: 400 });
    }

    // 4. Process image using centralized service with timeout
    console.log('[Upscale] Starting image processing with Deep-Image...');
    const processingOptions: any = {
      operation: 'upscale',
      processingMode,
      faceEnhance: false
    };
    
    // Add either scale or target dimensions
    if (targetWidth && targetHeight) {
      processingOptions.targetWidth = targetWidth;
      processingOptions.targetHeight = targetHeight;
      console.log('[Upscale] Using target dimensions:', { targetWidth, targetHeight });
    } else {
      processingOptions.scale = (scale || 4) as 2 | 4;
      console.log('[Upscale] Using scale factor:', processingOptions.scale);
    }
    
    const processingPromise = imageProcessingService.processImage(
      user.id,
      finalImageUrl,
      processingOptions
    );
    
    // Race between processing and timeout
    const result = await Promise.race([
      processingPromise,
      timeoutPromise.then(() => {
        throw new Error('Image processing timed out after 45 seconds');
      })
    ]) as Awaited<typeof processingPromise>;

    // 5. Return result
    console.log('[Upscale] Processing result:', {
      success: result.success,
      hasUrl: !!result.processedUrl,
      url: result.processedUrl?.substring(0, 50) + '...'
    });
    
    if (result.success) {
      let finalUrl = result.processedUrl;
      let savedId: string | undefined; // Declare savedId in the outer scope
      
      console.log('[Upscale] Initial processedUrl type:', {
        isDataUrl: result.processedUrl?.startsWith('data:'),
        isHttpUrl: result.processedUrl?.startsWith('http'),
        length: result.processedUrl?.length,
        prefix: result.processedUrl?.substring(0, 100)
      });
      
      // Save to gallery and get public URL (for both data URLs and Deep-Image URLs)
      if (result.processedUrl) {
        try {
          console.log('[Upscale] Attempting to save to gallery...');
          savedId = await saveProcessedImageToGallery({
            userId: user.id,
            processedUrl: result.processedUrl,
            operationType: 'upscale',
            originalFilename: imageFile?.name || 'upscaled_image',
            metadata: {
              scale,
              processingMode,
              creditsUsed: result.metadata?.creditsUsed || 1,
              processingTime: result.metadata?.processingTime
            }
          });
          console.log('[Upscale] Save result:', {
            savedId,
            success: !!savedId
          });
          
          // If saved successfully, get the public URL (for both data URLs and HTTP URLs)
          // Deep-Image URLs expire quickly, so we always need to use our stored version
          if (savedId) {
            console.log('[Upscale] Converting data URL to storage URL...');
            // Get the public URL for the saved image
            const serviceClient = createServiceRoleClient();
            
            // Get the image from the database to get the correct path
            const { data: imageData, error: dbError } = await serviceClient
              .from('processed_images')
              .select('storage_url')
              .eq('id', savedId)
              .single();
              
            console.log('[Upscale] Database query result:', {
              hasData: !!imageData,
              storageUrl: imageData?.storage_url,
              error: dbError
            });
              
            if (imageData?.storage_url) {
              // The storage_url is just the path, not a full URL
              // We need to get the public URL from Supabase storage
              const { data: urlData } = serviceClient.storage
                .from('images')
                .getPublicUrl(imageData.storage_url);
              
              console.log('[Upscale] Public URL generation:', {
                storagePath: imageData.storage_url,
                hasUrl: !!urlData?.publicUrl,
                generatedUrl: urlData?.publicUrl,
                supabaseUrl: env.SUPABASE_URL
              });
              
              if (urlData?.publicUrl) {
                console.log('[Upscale] Successfully converted to storage URL');
                finalUrl = urlData.publicUrl;
                
                // Verify the URL is valid
                if (!finalUrl.startsWith('http')) {
                  console.error('[Upscale] Generated URL is invalid:', finalUrl);
                  // Construct the URL manually as a fallback
                  finalUrl = `${env.SUPABASE_URL}/storage/v1/object/public/images/${imageData.storage_url}`;
                  console.log('[Upscale] Manually constructed URL:', finalUrl);
                }
              } else {
                console.log('[Upscale] Failed to get public URL from storage');
                // Construct the URL manually as a fallback
                finalUrl = `${env.SUPABASE_URL}/storage/v1/object/public/images/${imageData.storage_url}`;
                console.log('[Upscale] Manually constructed fallback URL:', finalUrl);
              }
            } else {
              console.log('[Upscale] No storage_url found in database');
            }
          }
        } catch (saveError) {
          console.error('[Upscale] Error saving to gallery:', saveError);
          // Don't fail the request if saving fails
        }
      }
      
      console.log('[Upscale] Final URL type:', {
        isDataUrl: finalUrl?.startsWith('data:'),
        length: finalUrl?.length,
        prefix: finalUrl?.substring(0, 100)
      });
      
      // CRITICAL FIX: Never return data URLs to the client
      // They cause navigation issues and "about:blank#blocked" errors
      if (finalUrl?.startsWith('data:')) {
        console.error('[Upscale] WARNING: Still have data URL after processing, this will cause navigation issues!');
        return NextResponse.json(
          { error: 'Failed to convert image to storage URL. Please try again.' },
          { status: 500 }
        );
      }
      
      // If we still have a Deep-Image URL, it means the save to storage failed
      // We can still return it, but it will expire soon
      if (finalUrl?.includes('deep-image.ai')) {
        console.warn('[Upscale] WARNING: Returning Deep-Image URL. This URL will expire soon:', finalUrl?.substring(0, 100));
        // Continue and return the URL - it will work temporarily
      }
      
      return NextResponse.json({
        success: true,
        url: finalUrl,
        imageId: savedId, // Include the image ID for navigation
        processingTime: result.metadata?.processingTime,
        creditsUsed: result.metadata?.creditsUsed
      });
    } else {
      console.error('[Upscale] Processing failed:', {
        error: result.error,
        success: result.success,
        hasProcessedUrl: !!result.processedUrl
      });
      return NextResponse.json(
        { error: result.error || 'Upscaling failed' },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('[Upscale] Error in handler:', error);
    
    // Ensure we always return valid JSON
    const errorMessage = error instanceof Error ? error.message : 'Upscaling failed';
    
    // Check for specific error types
    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'The image processing is taking longer than expected. Please try again with a smaller image or simpler processing options.',
          details: errorMessage 
        },
        { status: 504 }
      );
    }
    
    if (errorMessage.includes('Insufficient credits')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 402 } // Payment Required
      );
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'processing');