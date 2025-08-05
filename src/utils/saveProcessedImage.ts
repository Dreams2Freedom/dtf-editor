import { createServiceRoleClient } from '@/lib/supabase/server';

interface SaveImageParams {
  userId: string;
  processedUrl: string;
  operationType: 'upscale' | 'background-removal' | 'vectorization';
  originalFilename?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

export async function saveProcessedImageToGallery({
  userId,
  processedUrl,
  operationType,
  originalFilename = 'processed_image',
  fileSize = 0,
  metadata = {}
}: SaveImageParams) {
  try {
    const serviceClient = createServiceRoleClient();
    
    // Download the processed image
    const response = await fetch(processedUrl);
    if (!response.ok) {
      console.error('Failed to download processed image:', response.statusText);
      return null;
    }
    
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/png';
    const actualFileSize = fileSize || imageBuffer.byteLength;
    
    // Generate filename
    const extension = contentType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const processedFilename = `${operationType}_${timestamp}.${extension}`;
    const storagePath = `${userId}/processed/${processedFilename}`;
    
    // Upload to Supabase Storage (use 'images' bucket which is public)
    const { data: uploadData, error: uploadError } = await serviceClient
      .storage
      .from('images')
      .upload(storagePath, imageBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Failed to upload to storage:', uploadError);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = serviceClient
      .storage
      .from('images')
      .getPublicUrl(storagePath);
    
    // Save to processed_images table using RPC function
    const { data: savedImageId, error: saveError } = await serviceClient.rpc('insert_processed_image', {
      p_user_id: userId,
      p_original_filename: originalFilename,
      p_processed_filename: processedFilename,
      p_operation_type: operationType,
      p_file_size: actualFileSize,
      p_processing_status: 'completed',
      p_storage_url: publicUrl,
      p_thumbnail_url: publicUrl,
      p_metadata: {
        ...metadata,
        original_url: processedUrl,
        storage_path: storagePath,
        saved_at: new Date().toISOString()
      }
    });
    
    if (saveError) {
      console.error('Failed to save to gallery:', saveError);
      return null;
    }
    
    console.log(`Saved ${operationType} image to gallery with ID:`, savedImageId);
    return savedImageId;
    
  } catch (error) {
    console.error('Error saving to gallery:', error);
    return null;
  }
}