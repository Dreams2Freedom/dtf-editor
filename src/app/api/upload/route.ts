import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StorageService } from '@/services/storage';
import { withRateLimit } from '@/lib/rate-limit';

// Configure size limit for this route (50MB)
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

// This version works WITHOUT the uploads database table
async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Your session has expired. Please sign in again to continue.',
          code: 'SESSION_EXPIRED'
        },
        { status: 401 }
      );
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('image')) as File;
    
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
    
    // Use base64 encode the path as the ID to avoid issues
    // This ensures we can always reconstruct the exact path
    const imageId = Buffer.from(uploadResult.path).toString('base64url');
    
    console.log('Upload successful:');
    console.log('Path:', uploadResult.path);
    console.log('Image ID (base64):', imageId);
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

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'upload');