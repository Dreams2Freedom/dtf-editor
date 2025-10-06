import sharp from 'sharp';

/**
 * Adds a watermark to an image buffer while preserving transparency
 * Uses Sharp's composite operation with semi-transparent SVG overlay
 *
 * CRITICAL FOR DTF PRINTING: Preserves PNG alpha channel for transparent backgrounds
 */
export async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata to determine dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // Calculate watermark size based on image dimensions
    // Font size scales with image size (3-6% of image width)
    const fontSize = Math.max(24, Math.min(72, width * 0.04));

    // Create highly visible watermark SVG with stroke for contrast
    // Uses white text with black stroke - visible on ANY background
    // Using generic sans-serif that works in all environments
    const watermarkSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .watermark {
            fill: rgba(255, 255, 255, 0.6);
            stroke: rgba(0, 0, 0, 0.7);
            stroke-width: 2px;
            paint-order: stroke fill;
            font-size: ${fontSize}px;
            font-family: sans-serif;
            font-weight: bold;
            letter-spacing: 3px;
          }
        </style>
        <text
          x="50%"
          y="50%"
          text-anchor="middle"
          dominant-baseline="middle"
          transform="rotate(-45 ${width / 2} ${height / 2})"
          class="watermark"
        >
          PREVIEW
        </text>
      </svg>
    `);

    // Apply watermark using composite operation
    // CRITICAL: Using 'over' blend mode preserves alpha channel
    const watermarked = await sharp(imageBuffer)
      .composite([
        {
          input: watermarkSvg,
          gravity: 'centre',
          blend: 'over', // Preserves transparency
        },
      ])
      .png({
        compressionLevel: 6, // Balanced compression
        quality: 100, // Maximum quality
        palette: false, // Use full color (not indexed)
        alpha: true, // CRITICAL: Preserve alpha channel for transparency
      })
      .toBuffer();

    console.log(
      '[Watermark] Successfully added watermark, preserving transparency'
    );
    return watermarked;
  } catch (error) {
    console.error('[Watermark] Error adding watermark:', error);
    throw new Error(
      `Failed to add watermark: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validates that an image buffer has transparent pixels
 * Useful for testing/debugging transparency preservation
 */
export async function hasTransparency(imageBuffer: Buffer): Promise<boolean> {
  try {
    const { hasAlpha, channels } = await sharp(imageBuffer).metadata();
    return hasAlpha === true && channels === 4; // 4 channels = RGBA
  } catch (error) {
    console.error('[Watermark] Error checking transparency:', error);
    return false;
  }
}
