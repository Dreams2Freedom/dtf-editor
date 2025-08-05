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
  console.log('[SaveProcessedImage] Starting save:', {
    userId,
    processedUrl: processedUrl?.substring(0, 50) + '...',
    operationType
  });
  
  try {
    const serviceClient = createServiceRoleClient();
    
    // Check if it's a data URL
    let imageBuffer: ArrayBuffer;
    let contentType: string;
    
    if (processedUrl.startsWith('data:')) {
      console.log('[SaveProcessedImage] Processing data URL...');
      
      // Extract content type and base64 data
      const matches = processedUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error('[SaveProcessedImage] Invalid data URL format');
        return null;
      }
      
      contentType = matches[1];
      const base64Data = matches[2];
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      imageBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      console.log('[SaveProcessedImage] Converted data URL to buffer, size:', imageBuffer.byteLength);
    } else {
      // Download from URL
      console.log('[SaveProcessedImage] Downloading from:', processedUrl);
      const response = await fetch(processedUrl);
      console.log('[SaveProcessedImage] Response status:', response.status);
      console.log('[SaveProcessedImage] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('[SaveProcessedImage] Failed to download:', {
          status: response.status,
          statusText: response.statusText,
          url: processedUrl
        });
        return null;
      }
      
      imageBuffer = await response.arrayBuffer();
      contentType = response.headers.get('Content-Type') || 'image/png';
      console.log('[SaveProcessedImage] Downloaded buffer size:', imageBuffer.byteLength);
    }
    
    if (imageBuffer.byteLength === 0) {
      console.error('[SaveProcessedImage] Empty buffer!');
      return null;
    }
    
    const actualFileSize = fileSize || imageBuffer.byteLength;
    console.log('[SaveProcessedImage] Content type:', contentType, 'File size:', actualFileSize);
    
    // Generate filename
    const extension = contentType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const processedFilename = `${operationType}_${timestamp}.${extension}`;
    const storagePath = `${userId}/processed/${processedFilename}`;
    
    // Upload to Supabase Storage (use 'images' bucket which is public)
    console.log('[SaveProcessedImage] Uploading to storage:', {
      path: storagePath,
      size: actualFileSize,
      contentType
    });
    
    // Convert ArrayBuffer to Buffer for upload
    const buffer = Buffer.from(imageBuffer);
    console.log('[SaveProcessedImage] Buffer size for upload:', buffer.length);
    
    const { data: uploadData, error: uploadError } = await serviceClient
      .storage
      .from('images')
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[SaveProcessedImage] Upload failed:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: uploadError.statusCode
      });
      return null;
    }
    
    console.log('[SaveProcessedImage] Upload successful:', uploadData);
    
    // Get public URL
    const { data: { publicUrl } } = serviceClient
      .storage
      .from('images')
      .getPublicUrl(storagePath);
    
    console.log('[SaveProcessedImage] Generated public URL:', publicUrl);
    console.log('[SaveProcessedImage] Storage path:', storagePath);
    
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
      console.error('[SaveProcessedImage] Failed to save to gallery:', {
        error: saveError,
        message: saveError.message,
        code: saveError.code,
        details: saveError.details
      });
      return null;
    }
    
    console.log(`Saved ${operationType} image to gallery with ID:`, savedImageId);
    return savedImageId;
    
  } catch (error) {
    console.error('Error saving to gallery:', error);
    return null;
  }
}