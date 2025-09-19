/**
 * Image compression utilities for handling large files
 * Ensures images are optimized before processing to prevent timeouts
 */

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Compress an image file to meet size and dimension requirements
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file or original if already small enough
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 10, // Default 10MB max
    maxWidthOrHeight = 4096, // Default max dimension
    quality = 0.9,
    format = 'jpeg'
  } = options;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  console.log('[ImageCompression] Starting compression:', {
    originalName: file.name,
    originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    originalType: file.type,
    maxSizeMB,
    maxWidthOrHeight
  });

  // Check if compression is needed
  if (file.size <= maxSizeBytes) {
    // Check dimensions
    const dimensions = await getImageDimensions(file);
    if (dimensions.width <= maxWidthOrHeight && dimensions.height <= maxWidthOrHeight) {
      console.log('[ImageCompression] No compression needed');
      return file;
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = async () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        
        // Scale down if exceeds max dimensions
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          const scale = Math.min(maxWidthOrHeight / width, maxWidthOrHeight / height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
          console.log(`[ImageCompression] Resizing from ${img.width}x${img.height} to ${width}x${height}`);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to meet size requirement
        let compressedFile: File | null = null;
        let currentQuality = quality;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(
              (blob) => resolve(blob),
              `image/${format}`,
              currentQuality
            );
          });

          if (!blob) {
            throw new Error('Failed to compress image');
          }

          compressedFile = new File([blob], file.name, { type: `image/${format}` });

          console.log(`[ImageCompression] Attempt ${attempts + 1}: Quality ${currentQuality}, Size ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

          if (compressedFile.size <= maxSizeBytes) {
            break;
          }

          // Reduce quality for next attempt
          currentQuality *= 0.8;
          attempts++;
        }

        if (!compressedFile || compressedFile.size > maxSizeBytes) {
          console.warn('[ImageCompression] Could not achieve target size, returning best effort');
        }

        console.log('[ImageCompression] Compression complete:', {
          finalSize: `${(compressedFile!.size / 1024 / 1024).toFixed(2)}MB`,
          finalDimensions: `${width}x${height}`,
          compressionRatio: `${((1 - compressedFile!.size / file.size) * 100).toFixed(1)}%`
        });

        resolve(compressedFile!);
      } catch (error) {
        console.error('[ImageCompression] Compression failed:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    // Load image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from a file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a URL to a File object
 */
export async function urlToFile(url: string, filename: string = 'image'): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  const contentType = blob.type || 'image/jpeg';
  const extension = contentType.split('/')[1] || 'jpg';
  return new File([blob], `${filename}.${extension}`, { type: contentType });
}

/**
 * Check if an image needs compression based on size and dimensions
 */
export async function needsCompression(
  file: File,
  maxSizeMB: number = 10,
  maxDimension: number = 4096
): Promise<boolean> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return true;
  }

  try {
    const dimensions = await getImageDimensions(file);
    return dimensions.width > maxDimension || dimensions.height > maxDimension;
  } catch {
    // If we can't get dimensions, assume compression might be needed
    return file.size > maxSizeBytes / 2;
  }
}