import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();
    const serviceClient = createServiceRoleClient();
    
    // Get the latest image from processed_images
    const { data: images, error } = await serviceClient
      .from('processed_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Check bucket status
    const { data: buckets } = await serviceClient
      .storage
      .listBuckets();
    
    const imagesBucket = buckets?.find(b => b.name === 'images');
    
    // Try to access an image directly
    const testResults = [];
    
    if (images && images.length > 0) {
      for (const img of images) {
        // Extract the path from the URL
        const url = new URL(img.storage_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/);
        const filePath = pathMatch ? pathMatch[1] : null;
        
        if (filePath) {
          // Try to get a signed URL
          const { data: signedUrlData, error: signedError } = await serviceClient
            .storage
            .from('images')
            .createSignedUrl(filePath, 60); // 60 seconds
          
          testResults.push({
            id: img.id,
            filename: img.processed_filename,
            publicUrl: img.storage_url,
            filePath,
            signedUrl: signedUrlData?.signedUrl,
            signedError: signedError?.message,
            fileSize: img.file_size
          });
        }
      }
    }
    
    return NextResponse.json({
      bucketInfo: {
        name: imagesBucket?.name,
        public: imagesBucket?.public,
        file_size_limit: imagesBucket?.file_size_limit,
        allowed_mime_types: imagesBucket?.allowed_mime_types
      },
      totalImages: images?.length || 0,
      testResults,
      message: 'Check if bucket is public and URLs are accessible'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');