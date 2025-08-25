import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { env } from '@/config/env';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const imageId = resolvedParams.id;
    
    console.log('ClippingMagic download request:', {
      imageId,
      userId: user.id,
      hasApiKey: !!env.CLIPPINGMAGIC_API_KEY,
      hasApiSecret: !!env.CLIPPINGMAGIC_API_SECRET
    });
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID required' },
        { status: 400 }
      );
    }
    
    // Check if API credentials are available
    if (!env.CLIPPINGMAGIC_API_KEY || !env.CLIPPINGMAGIC_API_SECRET) {
      console.error('ClippingMagic API credentials missing');
      return NextResponse.json(
        { error: 'ClippingMagic API not configured properly' },
        { status: 500 }
      );
    }
    
    const authHeader = 'Basic ' + Buffer.from(
      env.CLIPPINGMAGIC_API_KEY + ':' + env.CLIPPINGMAGIC_API_SECRET
    ).toString('base64');

    // Download the processed image with 300 DPI for print-ready output
    const queryParams = new URLSearchParams({
      'format': 'png',
      'output.dpi': '300' // CRITICAL: Set to 300 DPI for DTF printing
    });
    
    const response = await fetch(`https://clippingmagic.com/api/v1/images/${imageId}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ClippingMagic API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return NextResponse.json(
        { error: `ClippingMagic error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/png';
    
    // Save to gallery
    try {
      const serviceClient = createServiceRoleClient();
      
      // Generate filename
      const extension = contentType.split('/')[1] || 'png';
      const timestamp = Date.now();
      const filename = `clippingmagic_${imageId}_${timestamp}.${extension}`;
      const storagePath = `${user.id}/processed/${filename}`;
      
      // Upload to Supabase Storage (use 'images' bucket which is public)
      const { data: uploadData, error: uploadError } = await serviceClient
        .storage
        .from('images')
        .upload(storagePath, imageBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Failed to upload to storage:', uploadError);
      } else {
        // Get public URL (images bucket is public)
        const { data: { publicUrl } } = serviceClient
          .storage
          .from('images')
          .getPublicUrl(storagePath);
        
        const imageUrl = publicUrl;
        
        // Save to processed_images table
        const { data: savedImageId, error: saveError } = await serviceClient.rpc('insert_processed_image', {
          p_user_id: user.id,
          p_original_filename: `background_removal_${timestamp}.${extension}`,
          p_processed_filename: filename,
          p_operation_type: 'background-removal',
          p_file_size: imageBuffer.byteLength,
          p_processing_status: 'completed',
          p_storage_url: imageUrl,
          p_thumbnail_url: imageUrl,
          p_metadata: {
            credits_used: 1,
            processing_time_ms: 0,
            api_used: 'ClippingMagic',
            clippingmagic_id: imageId,
            storage_path: storagePath
          }
        });
        
        if (saveError) {
          console.error('Failed to save to gallery:', saveError);
        } else {
          console.log('Saved to gallery with ID:', savedImageId);
        }
      }
    } catch (error) {
      console.error('Error saving to gallery:', error);
      // Don't fail the download if gallery save fails
    }
    
    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('ClippingMagic download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to download image',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}