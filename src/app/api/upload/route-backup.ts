import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StorageService } from '@/services/storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large' },
        { status: 400 }
      );
    }

    // Initialize storage service
    let storage;
    try {
      storage = new StorageService();
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      return NextResponse.json(
        { success: false, error: 'Storage service configuration error' },
        { status: 500 }
      );
    }
    
    // Upload to Supabase storage
    const uploadResult = await storage.uploadImage(file, user.id);
    
    console.log('Upload result:', uploadResult);
    
    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }
    
    // For now, use the full filename as the ID (since uploads table doesn't exist yet)
    // This includes the timestamp and makes it unique
    const fullFileName = uploadResult.path.split('/').pop() || `img_${Date.now()}.png`;
    const imageId = fullFileName.replace(/\.[^/.]+$/, ''); // Remove extension for ID
    
    console.log('Upload successful:');
    console.log('Full filename:', fullFileName);
    console.log('Image ID:', imageId);
    console.log('For user:', user.id);
    console.log('URL:', uploadResult.url);

    return NextResponse.json({
      success: true,
      imageId: imageId,
      publicUrl: uploadResult.url
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}