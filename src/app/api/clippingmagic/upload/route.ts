import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';
import { ImageProcessingService } from '@/services/imageProcessing';

export async function POST(request: NextRequest) {
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

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
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
        { error: 'Insufficient credits. Please purchase more credits to continue.' },
        { status: 402 }
      );
    }

    // Debug auth
    console.log('ClippingMagic Upload Debug:', {
      hasApiKey: !!env.CLIPPINGMAGIC_API_KEY,
      hasApiSecret: !!env.CLIPPINGMAGIC_API_SECRET,
      apiKeyLength: env.CLIPPINGMAGIC_API_KEY?.length,
      apiSecretLength: env.CLIPPINGMAGIC_API_SECRET?.length
    });
    
    // Create Basic Auth header
    const authHeader = 'Basic ' + Buffer.from(
      env.CLIPPINGMAGIC_API_KEY + ':' + env.CLIPPINGMAGIC_API_SECRET
    ).toString('base64');

    // Prepare form data for ClippingMagic
    const cmFormData = new FormData();
    cmFormData.append('image', file);
    cmFormData.append('format', 'json');
    
    // Add test parameter in development
    if (process.env.NODE_ENV === 'development') {
      cmFormData.append('test', 'true');
    }

    // Upload to ClippingMagic
    const response = await fetch('https://clippingmagic.com/api/v1/images', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: cmFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ClippingMagic error: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // DO NOT deduct credits here - wait until the user completes the operation
    // Credits will be deducted when the result is generated
    
    // Return the image ID and secret for the editor
    return NextResponse.json({
      success: true,
      image: {
        id: result.image.id,
        secret: result.image.secret,
      }
    });

  } catch (error) {
    console.error('ClippingMagic upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}