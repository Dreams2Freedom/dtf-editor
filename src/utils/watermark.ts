import sharp from 'sharp';

/**
 * Adds a repeating watermark to an image buffer while preserving transparency
 * Uses Sharp's native text rendering with tiled composite operation
 *
 * CRITICAL FOR DTF PRINTING: Preserves PNG alpha channel for transparent backgrounds
 */
export async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata to determine dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // Calculate font size based on image dimensions (2-4% of width)
    const fontSize = Math.max(32, Math.min(80, width * 0.035));

    console.log('[Watermark] Creating text overlay:', {
      imageSize: `${width}x${height}`,
      fontSize,
    });

    // Create text image using Sharp's native text API (vips_text)
    // Uses Pango markup for styling with stroke for visibility on all backgrounds
    const textWidth = Math.floor(width * 0.4); // Text tile is 40% of image width
    const textHeight = Math.floor(fontSize * 2); // Height based on font size

    // Use Pango markup for styled text with background for contrast
    // White text with semi-transparency, visible on all backgrounds
    const textBuffer = await sharp({
      text: {
        text: `<span foreground="white" background="rgba(0,0,0,0.5)"> PREVIEW </span>`,
        font: 'sans-serif',
        fontfile: undefined, // Let Sharp use system fonts
        width: textWidth,
        height: textHeight,
        align: 'center',
        rgba: true, // Enable RGBA for transparency
        dpi: Math.floor(fontSize * 2), // DPI affects text size
      },
    })
      .png({ compressionLevel: 6, alpha: true })
      .toBuffer();

    console.log('[Watermark] Text created, applying rotation...');

    // Rotate text -45 degrees for diagonal watermark
    // Extend canvas to prevent cropping during rotation
    const rotatedText = await sharp(textBuffer)
      .rotate(-45, {
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
      })
      .png({ compressionLevel: 6, alpha: true })
      .toBuffer();

    console.log('[Watermark] Compositing tiled watermark...');

    // Apply watermark using composite with tile: true to repeat across entire image
    // CRITICAL: Using 'over' blend mode preserves alpha channel
    const watermarked = await sharp(imageBuffer)
      .composite([
        {
          input: rotatedText,
          tile: true, // Repeat watermark across entire image
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
      '[Watermark] Successfully added repeating watermark, preserving transparency'
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
