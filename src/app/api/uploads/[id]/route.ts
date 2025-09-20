import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
    
    // Check authentication - try to get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // If auth fails, try to get user from session (sometimes needed in production)
    if (authError || !user) {
      console.error('[Uploads API] Authentication failed:', authError?.message || 'No user found');
      
      // For processed images, we can be less strict since they're already public URLs
      // Check if this is a UUID (processed image)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        // Not a processed image, require auth
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      // For processed images, continue without user check
      console.log('[Uploads API] Allowing public access to processed image:', id);
    }
    
    console.log('Looking for image with ID:', id);
    console.log('Current user:', user.id);
    
    // First, check if this is a processed image ID (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      console.log('ID appears to be a UUID, checking processed_images table');
      
      // Query the processed_images table
      // If we have a user, filter by user_id for security
      // If no user (public access), just get by ID
      let query = supabase.from('processed_images').select('storage_url').eq('id', id);
      
      if (user) {
        query = query.eq('user_id', user.id);
      }
      
      const { data: processedImage, error: dbError } = await query.single();
      
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