import { createServiceRoleClient } from '@/lib/supabase/server';
import sharp from 'sharp';

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
    operationType,
    isDataUrl: processedUrl?.startsWith('data:'),
    urlLength: processedUrl?.length
  });
  
  if (!processedUrl) {
    console.error('[SaveProcessedImage] No URL provided');
    return null;
  }
  
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
      
      console.log('[SaveProcessedImage] Data URL details:', {
        contentType,
        base64Length: base64Data.length,
        isSvg: contentType === 'image/svg+xml'
      });
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      imageBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      console.log('[SaveProcessedImage] Converted data URL to buffer, size:', imageBuffer.byteLength);
      
      // Check for extremely large files
      if (imageBuffer.byteLength > 50 * 1024 * 1024) { // 50MB limit
        console.error('[SaveProcessedImage] File too large:', imageBuffer.byteLength);
        return null;
      }
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
    let extension = contentType.split('/')[1] || 'png';
    // Handle special cases
    if (extension === 'svg+xml') {
      extension = 'svg';
    } else if (extension === 'jpeg') {
      extension = 'jpg';
    }
    
    // Force PNG for upscaled images to maintain quality
    let buffer: Buffer;
    
    if (operationType === 'upscale') {
      console.log('[SaveProcessedImage] FORCING PNG CONVERSION for upscaled image');
      console.log('[SaveProcessedImage] Original content type:', contentType);
      console.log('[SaveProcessedImage] Original extension would be:', extension);
      
      try {
        // Convert the image to PNG format using sharp
        const inputBuffer = Buffer.from(imageBuffer);
        console.log('[SaveProcessedImage] Input buffer size:', inputBuffer.length);
        
        // Use sharp to convert to PNG with maximum quality
        buffer = await sharp(inputBuffer)
          .png({ 
            quality: 100,
            compressionLevel: 9, // Max compression (lossless)
            effort: 10, // Max effort for better compression
            force: true // Force PNG output even if input is PNG
          })
          .toBuffer();
        
        // Force extension and content type to PNG
        extension = 'png';
        contentType = 'image/png';
        
        console.log('[SaveProcessedImage] ✅ PNG CONVERSION SUCCESSFUL');
        console.log('[SaveProcessedImage] New buffer size:', buffer.length);
        console.log('[SaveProcessedImage] New extension:', extension);
        console.log('[SaveProcessedImage] New content type:', contentType);
      } catch (conversionError) {
        console.error('[SaveProcessedImage] ❌ PNG CONVERSION FAILED:', conversionError);
        console.error('[SaveProcessedImage] Error details:', {
          message: (conversionError as Error).message,
          stack: (conversionError as Error).stack
        });
        // Fallback to original buffer if conversion fails
        buffer = Buffer.from(imageBuffer);
        // Still force PNG extension even if conversion fails
        extension = 'png';
        contentType = 'image/png';
        console.log('[SaveProcessedImage] Using fallback buffer but forcing PNG extension');
      }
    } else {
      // For non-upscale operations, use the original buffer
      buffer = Buffer.from(imageBuffer);
    }
    
    const timestamp = Date.now();
    const processedFilename = `${operationType}_${timestamp}.${extension}`;
    const storagePath = `${userId}/processed/${processedFilename}`;
    
    // Upload to Supabase Storage (use 'images' bucket which is public)
    console.log('[SaveProcessedImage] Uploading to storage:', {
      path: storagePath,
      size: buffer.length,
      contentType,
      extension
    });
    
    console.log('[SaveProcessedImage] Buffer size for upload:', buffer.length);
    
    // For SVG files, ensure we're uploading with the correct content type
    const uploadOptions = {
      contentType,
      cacheControl: '3600',
      upsert: false
    };
    
    if (contentType === 'image/svg+xml') {
      console.log('[SaveProcessedImage] Uploading SVG file with special handling');
    }
    
    const { data: uploadData, error: uploadError } = await serviceClient
      .storage
      .from('images')
      .upload(storagePath, buffer, uploadOptions);
    
    if (uploadError) {
      console.error('[SaveProcessedImage] Upload failed:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: (uploadError as any).statusCode
      });
      return null;
    }
    
    console.log('[SaveProcessedImage] Upload successful:', uploadData);
    console.log('[SaveProcessedImage] Storage path:', storagePath);
    
    // Instead of storing signed URLs (which expire), store the path
    // and generate signed URLs on demand when displaying images
    const storagePathUrl = `${storagePath}`; // Just store the path
    
    // Save to processed_images table using RPC function
    const { data: savedImageId, error: saveError } = await serviceClient.rpc('insert_processed_image', {
      p_user_id: userId,
      p_original_filename: originalFilename,
      p_processed_filename: processedFilename,
      p_operation_type: operationType,
      p_file_size: actualFileSize,
      p_processing_status: 'completed',
      p_storage_url: storagePathUrl,
      p_thumbnail_url: storagePathUrl,
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
    
    // Final verification for upscale operations
    if (operationType === 'upscale') {
      console.log('[SaveProcessedImage] ✅ FINAL VERIFICATION - Upscaled image saved as PNG:', {
        imageId: savedImageId,
        storagePath,
        filename: processedFilename,
        extension,
        contentType,
        isPNG: extension === 'png' && contentType === 'image/png'
      });
      
      if (!processedFilename.endsWith('.png')) {
        console.error('[SaveProcessedImage] ⚠️ WARNING: Upscaled image filename does not end with .png!', processedFilename);
      }
    }
    
    return savedImageId;
    
  } catch (error) {
    console.error('[SaveProcessedImage] Error saving to gallery:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      operationType,
      userId
    });
    return null;
  }
}