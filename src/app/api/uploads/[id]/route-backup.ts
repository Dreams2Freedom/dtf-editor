import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    // Since we don't have the uploads table yet, we'll construct the URL directly
    // The ID is the filename without extension, so we need to find the actual file
    
    console.log('Looking for upload with ID:', id);
    console.log('Current user:', user.id);
    
    // The ID might be the full filename without extension, so let's try different approaches
    const fileName = id;
    
    // If ID doesn't have an extension, try common image extensions
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    let foundFile = null;
    
    // First, try to get the file directly with the ID as filename
    for (const ext of ['', ...possibleExtensions]) {
      const testName = id + ext;
      const { data: fileData } = await supabase.storage
        .from('user-uploads')
        .download(`users/${user.id}/${testName}`);
      
      if (fileData) {
        foundFile = testName;
        break;
      }
    }
    
    // If not found, list files and search
    if (!foundFile) {
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
      
      // Find file that matches our ID (with or without extension)
      const file = files?.find(f => {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
        return f.name === id || nameWithoutExt === id || f.name.startsWith(id);
      });
      
      if (file) {
        foundFile = file.name;
      }
    }
    
    if (!foundFile) {
      console.error('No file found with ID:', id);
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }
    
    // Construct the public URL
    const publicUrl = supabase.storage
      .from('user-uploads')
      .getPublicUrl(`users/${user.id}/${foundFile}`).data.publicUrl;
    
    console.log('Found file:', foundFile);
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