import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Based on Next.js 15 documentation for dynamic route handlers
// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the dynamic parameter
    const { id } = await params;
    
    // Get Supabase client
    const supabase = await createServerSupabaseClient();
    
    // First, check if this is a processed image ID (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isProcessedImageId = uuidRegex.test(id);

    // Check authentication - try to get user from session
    const { data: { user } } = await supabase.auth.getUser();

    // For processed images (UUIDs), we can allow access without strict authentication
    // because the URLs are already public in storage
    if (!user && !isProcessedImageId) {
      console.error('[Uploads API] Authentication required for non-UUID requests');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user && isProcessedImageId) {
      console.log('[Uploads API] Allowing public access to processed image (UUID):', id);
    }

    console.log('Looking for image with ID:', id);
    if (user) {
      console.log('Current user:', user.id);
    }
    if (isProcessedImageId) {
      console.log('ID appears to be a UUID, checking processed_images table');

      // For processed images, we use the service role client to bypass RLS
      // This is safe because processed images are meant to be publicly accessible
      const serviceClient = createServiceRoleClient();

      // Query the processed_images table by ID
      const { data: processedImage, error: dbError } = await serviceClient
        .from('processed_images')
        .select('storage_url, user_id')
        .eq('id', id)
        .single();
      
      if (dbError || !processedImage) {
        console.error('Processed image not found:', dbError);
        return NextResponse.json(
          { success: false, error: 'Image not found' },
          { status: 404 }
        );
      }
      
      console.log('Found processed image:', processedImage.storage_url);
      
      // Get the public URL from Supabase storage
      // storage_url contains the path like "userId/processed/filename.png"
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(processedImage.storage_url);
      
      console.log('Generated public URL:', publicUrlData.publicUrl);
      
      return NextResponse.json({
        success: true,
        publicUrl: publicUrlData.publicUrl,
        imageId: id
      });
    }
    
    // If we get here, it's not a UUID and we need a user
    if (!user) {
      console.error('[Uploads API] User required for non-UUID requests');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Otherwise, try to decode the ID as base64 to get the path
    let path: string;
    try {
      path = Buffer.from(id, 'base64url').toString('utf-8');
      console.log('Decoded path:', path);
    } catch (e) {
      // If not base64, assume it's a direct filename/path
      console.log('ID is not base64, treating as filename');
      path = id;
    }

    // Extract just the filename from the path if it includes directories
    const fileName = path.split('/').pop() || path;

    // Try to get the public URL directly
    const { data: publicUrlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(`users/${user.id}/${fileName}`);

    // Verify the file exists by trying to download it
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-uploads')
      .download(`users/${user.id}/${fileName}`);
    
    if (downloadError || !fileData) {
      console.error('File not found:', downloadError);
      
      // If direct approach fails, list files and find it
      const { data: files, error: listError } = await supabase.storage
        .from('user-uploads')
        .list(`users/${user.id}`);
      
      if (listError) {
        console.error('Error listing files:', listError);
        return NextResponse.json(
          { success: false, error: 'Failed to list files' },
          { status: 500 }
        );
      }
      
      // Find file that matches our filename (with or without extension)
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const matchedFile = files?.find(f => {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        return f.name === fileName || 
               nameWithoutExt === fileNameWithoutExt ||
               f.name.startsWith(fileNameWithoutExt);
      });
      
      if (!matchedFile) {
        console.error('No matching file found in list:', files?.map(f => f.name));
        return NextResponse.json(
          { success: false, error: 'Upload not found' },
          { status: 404 }
        );
      }
      
      // Get the public URL for the matched file
      const { data: matchedUrlData } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(`users/${user.id}/${matchedFile.name}`);
      
      console.log('Found file via listing:', matchedFile.name);
      console.log('Public URL:', matchedUrlData.publicUrl);
      
      return NextResponse.json({
        success: true,
        id: id,
        publicUrl: matchedUrlData.publicUrl
      });
    }
    
    console.log('Found file directly:', fileName);
    console.log('Public URL:', publicUrlData.publicUrl);

    return NextResponse.json({
      success: true,
      id: id,
      publicUrl: publicUrlData.publicUrl
    });

  } catch (error) {
    console.error('Fetch upload error:', error);
    
    // Ensure we always return valid JSON
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch upload',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}