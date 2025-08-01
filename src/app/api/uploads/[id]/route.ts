import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// This version works WITHOUT the uploads database table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params before accessing
    const { id } = await params;
    
    console.log('Looking for upload with ID:', id);
    console.log('Current user:', user.id);
    
    // Try to decode the ID as base64 to get the path
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
    const publicUrl = supabase.storage
      .from('user-uploads')
      .getPublicUrl(`users/${user.id}/${fileName}`).data.publicUrl;
    
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
      const matchedUrl = supabase.storage
        .from('user-uploads')
        .getPublicUrl(`users/${user.id}/${matchedFile.name}`).data.publicUrl;
      
      console.log('Found file via listing:', matchedFile.name);
      console.log('Public URL:', matchedUrl);
      
      return NextResponse.json({
        success: true,
        id: id,
        publicUrl: matchedUrl
      });
    }
    
    console.log('Found file directly:', fileName);
    console.log('Public URL:', publicUrl);

    return NextResponse.json({
      success: true,
      id: id,
      publicUrl: publicUrl
    });

  } catch (error) {
    console.error('Fetch upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upload' },
      { status: 500 }
    );
  }
}