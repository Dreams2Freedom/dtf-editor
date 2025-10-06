import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StorageService } from '@/services/storage';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
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

    // Get form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const originalId = formData.get('originalId') as string;
    const type = formData.get('type') as string;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Initialize storage service
    const storage = new StorageService();

    // Convert File to base64 data URL for storage
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // Store the processed image
    const fileName = `${type}-${Date.now()}.png`;
    const result = await storage.uploadImageFromDataUrl(
      dataUrl,
      fileName,
      user.id
    );

    // Save to uploads table as a processed image
    const { error: dbError } = await supabase.from('uploads').insert({
      user_id: user.id,
      file_name: fileName,
      file_path: fileName,
      file_size: imageFile.size,
      file_type: imageFile.type || 'image/png',
      public_url: result.url,
    });

    if (dbError) {
      console.error('Failed to save to history:', dbError);
    }

    return NextResponse.json({
      success: true,
      publicUrl: result.url,
      message: 'Processed image saved successfully',
    });
  } catch (error) {
    console.error('Save processed image error:', error);
    return NextResponse.json(
      { error: 'Failed to save processed image' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'upload');
