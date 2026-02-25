/**
 * Client-side image compression utility
 * Used to compress images before upload to stay within Vercel's API route body size limits
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxDimension?: number;
}

/**
 * Compress an image if it exceeds the specified size limit
 * Target 3MB by default to account for ~33% FormData encoding overhead
 * This keeps us safely under Vercel's 4.5MB API route limit
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxSizeMB = 3, maxDimension = 5000 } = options;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  console.log('[ImageCompression] Checking file:', {
    name: file.name,
    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
    type: file.type,
    maxSizeMB,
    maxDimension,
  });

  // If file is under the size limit, don't compress
  if (file.size <= maxSizeBytes) {
    console.log(
      '[ImageCompression] File under limit, no compression needed:',
      (file.size / 1024 / 1024).toFixed(2),
      'MB'
    );
    return file;
  }

  console.log(
    '[ImageCompression] File exceeds limit, compressing:',
    (file.size / 1024 / 1024).toFixed(2),
    'MB'
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      console.error('[ImageCompression] Failed to read file');
      reject(new Error('Failed to read file for compression'));
    };

    reader.onload = e => {
      const img = new Image();

      img.onerror = () => {
        console.error('[ImageCompression] Failed to load image');
        reject(new Error('Failed to load image for compression'));
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('[ImageCompression] Failed to get canvas context');
          resolve(file); // Return original on error
          return;
        }

        // Calculate dimensions - preserve quality
        let width = img.width;
        let height = img.height;

        // Only scale down if dimensions are absolutely massive
        if (width > maxDimension || height > maxDimension) {
          const scale = Math.min(maxDimension / width, maxDimension / height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
          console.log(
            '[ImageCompression] Scaling down from',
            img.width,
            'x',
            img.height,
            'to',
            width,
            'x',
            height
          );
        } else {
          console.log(
            '[ImageCompression] Preserving original dimensions:',
            width,
            'x',
            height
          );
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Start with good quality, will reduce if needed
        let quality = 0.85;
        let outputFormat = file.type;

        // Keep PNG format to preserve transparency (critical for DTF designs)
        // Only convert non-PNG formats to JPEG for compression
        if (file.type !== 'image/png' && file.size > maxSizeBytes) {
          outputFormat = 'image/jpeg';
          console.log(
            '[ImageCompression] Converting to JPEG for better compression'
          );
        } else if (file.type === 'image/png') {
          console.log(
            '[ImageCompression] Keeping PNG format to preserve transparency'
          );
        }

        const tryCompress = () => {
          canvas.toBlob(
            blob => {
              if (blob) {
                if (blob.size > maxSizeBytes && quality > 0.5) {
                  quality -= 0.05; // Gentle quality reduction
                  // Only switch to JPEG for non-PNG files (PNG needs alpha channel)
                  if (file.type !== 'image/png') {
                    outputFormat = 'image/jpeg';
                  }
                  console.log(
                    '[ImageCompression] Still too large, reducing quality to:',
                    quality.toFixed(2)
                  );
                  tryCompress();
                } else {
                  const fileName =
                    outputFormat === 'image/jpeg' && file.name.endsWith('.png')
                      ? file.name.replace(/\.png$/i, '.jpg')
                      : file.name;
                  const compressedFile = new File([blob], fileName, {
                    type: outputFormat,
                  });
                  console.log(
                    '[ImageCompression] Compressed to:',
                    (compressedFile.size / 1024 / 1024).toFixed(2),
                    'MB at quality:',
                    quality.toFixed(2),
                    'format:',
                    outputFormat
                  );
                  resolve(compressedFile);
                }
              } else {
                console.log(
                  '[ImageCompression] Failed to compress, using original'
                );
                resolve(file); // Fallback to original
              }
            },
            outputFormat,
            outputFormat === 'image/png' ? undefined : quality // PNG doesn't use quality
          );
        };

        tryCompress();
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
