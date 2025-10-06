import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';
import { ImageProcessingService } from '@/services/imageProcessing';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Next.js App Router approach for large file uploads
// We use dynamic configuration to override the body size limit
export const dynamic = 'force-dynamic';

// For App Router, we need to export this to increase body size limit
export const revalidate = 0;

// This is the new way to configure body size in App Router
export async function POST(request: NextRequest) {
  try {
    // Check authentication
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

    // Log content length but don't reject based on header alone
    // FormData encoding adds overhead, so the content-length is larger than the actual file
    const contentLength = request.headers.get('content-length');
    console.log(
      '[ClippingMagic Upload] Content length header:',
      contentLength,
      'bytes'
    );

    // We'll check the actual file size after parsing the form data
    const maxSize = 10 * 1024 * 1024; // 10MB limit for actual file

    // For large files, we need to handle the body as a stream
    // Get the raw body as ArrayBuffer first
    const contentType = request.headers.get('content-type') || '';

    let formData: FormData;

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data
      try {
        formData = await request.formData();
      } catch (error) {
        console.error(
          '[ClippingMagic Upload] Failed to parse form data:',
          error
        );

        // If formData parsing fails, try to read as blob
        const blob = await request.blob();
        console.log('[ClippingMagic Upload] Blob size:', blob.size);

        if (blob.size > maxSize) {
          return NextResponse.json(
            { error: 'File too large. Maximum size is 10MB.' },
            { status: 413 }
          );
        }

        // Create FormData from blob
        formData = new FormData();
        formData.append('image', blob, 'upload.png');
      }
    } else {
      return NextResponse.json(
        {
          error: 'Invalid content type. Please upload as multipart/form-data.',
        },
        { status: 400 }
      );
    }

    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check actual file size
    console.log(
      '[ClippingMagic Upload] Actual file size:',
      file.size,
      'bytes',
      '(',
      (file.size / 1024 / 1024).toFixed(2),
      'MB)'
    );
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Size is ${(file.size / 1024 / 1024).toFixed(2)}MB, maximum allowed is 10MB.`,
        },
        { status: 413 }
      );
    }

    // Check user credits
    const imageProcessing = new ImageProcessingService();
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits_remaining < 1) {
      return NextResponse.json(
        {
          error:
            'Insufficient credits. Please purchase more credits to continue.',
        },
        { status: 402 }
      );
    }

    // Debug auth
    console.log('ClippingMagic Upload Debug:', {
      hasApiKey: !!env.CLIPPINGMAGIC_API_KEY,
      hasApiSecret: !!env.CLIPPINGMAGIC_API_SECRET,
      fileSize: file.size,
      fileType: file.type,
      fileName: file.name,
    });

    // Create Basic Auth header
    const authHeader =
      'Basic ' +
      Buffer.from(
        env.CLIPPINGMAGIC_API_KEY + ':' + env.CLIPPINGMAGIC_API_SECRET
      ).toString('base64');

    // Convert WebP to PNG if necessary
    let fileToUpload = file;
    if (file.type === 'image/webp') {
      console.log('Converting WebP to PNG for ClippingMagic...');

      try {
        const buffer = await file.arrayBuffer();
        const pngBuffer = await sharp(Buffer.from(buffer)).png().toBuffer();

        fileToUpload = new File(
          [pngBuffer],
          file.name.replace('.webp', '.png'),
          {
            type: 'image/png',
          }
        );

        console.log('WebP successfully converted to PNG');
      } catch (conversionError) {
        console.error('Failed to convert WebP to PNG:', conversionError);
        return NextResponse.json(
          {
            error:
              'Failed to convert WebP image. Please try uploading a PNG or JPEG instead.',
          },
          { status: 400 }
        );
      }
    }

    // Prepare form data for ClippingMagic
    const cmFormData = new FormData();
    cmFormData.append('image', fileToUpload);
    cmFormData.append('format', 'json');

    // CRITICAL: Preserve full image resolution
    cmFormData.append('maxPixels', '26214400'); // Maximum allowed: 26.2 megapixels

    // CRITICAL: Fit to result with small margin for consistent framing
    cmFormData.append('fit.toResult', 'true'); // Fit to subject with margin
    cmFormData.append('fit.margin', '0.5'); // 0.5% margin (0.05% might be too tight, using 0.5%)
    cmFormData.append('result.allowEnlarging', 'true'); // Allow full size output

    // Set default processing mode to graphics for better DTF results
    cmFormData.append('processing.mode', 'graphics'); // Graphics mode is better for DTF designs

    // Add test parameter in development
    // NOTE: Test mode might cause issues with white label editor
    // Comment out for production-like testing
    // if (process.env.NODE_ENV === 'development') {
    //   cmFormData.append('test', 'true');
    // }

    // Upload to ClippingMagic
    const response = await fetch('https://clippingmagic.com/api/v1/images', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: cmFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ClippingMagic API error:', response.status, errorText);

      // Parse error message if it's JSON
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }

      // Log detailed error info for debugging
      console.error('ClippingMagic API Debug Info:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorMessage,
        apiKeyLength: env.CLIPPINGMAGIC_API_KEY?.length || 0,
        apiSecretLength: env.CLIPPINGMAGIC_API_SECRET?.length || 0,
      });

      return NextResponse.json(
        { error: `Background removal failed: ${errorMessage}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    console.log('ClippingMagic API response:', JSON.stringify(result, null, 2));

    // Return the image ID and secret for the editor
    return NextResponse.json({
      success: true,
      image: {
        id: result.image.id,
        secret: result.image.secret,
      },
    });
  } catch (error) {
    console.error('ClippingMagic upload error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}
