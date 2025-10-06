/**
 * DPI Calculator Utility
 * Calculates the DPI (Dots Per Inch) of an image based on its pixel dimensions and desired print size
 */

export interface DPICalculationInput {
  imageWidth: number; // Image width in pixels
  imageHeight: number; // Image height in pixels
  printWidth: number; // Desired print width in inches
  printHeight: number; // Desired print height in inches
}

export interface DPICalculationResult {
  horizontalDPI: number;
  verticalDPI: number;
  averageDPI: number;
  isHighQuality: boolean; // true if DPI >= 300
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
  printSizeAtOptimalDPI: {
    width: number;
    height: number;
  };
}

/**
 * Calculate DPI from image dimensions and desired print size
 */
export function calculateDPI(input: DPICalculationInput): DPICalculationResult {
  const { imageWidth, imageHeight, printWidth, printHeight } = input;

  // Calculate horizontal and vertical DPI
  const horizontalDPI = Math.round(imageWidth / printWidth);
  const verticalDPI = Math.round(imageHeight / printHeight);

  // Calculate average DPI
  const averageDPI = Math.round((horizontalDPI + verticalDPI) / 2);

  // Determine quality level
  let qualityLevel: DPICalculationResult['qualityLevel'];
  let recommendation: string;

  if (averageDPI >= 300) {
    qualityLevel = 'excellent';
    recommendation =
      'Perfect for professional DTF printing! Your image will produce crisp, high-quality transfers.';
  } else if (averageDPI >= 200) {
    qualityLevel = 'good';
    recommendation =
      'Good quality for most DTF applications. Consider upscaling for best results on detailed designs.';
  } else if (averageDPI >= 150) {
    qualityLevel = 'fair';
    recommendation =
      'Acceptable for simple designs but may appear pixelated. We recommend upscaling your image.';
  } else {
    qualityLevel = 'poor';
    recommendation =
      'Too low for quality DTF printing. Your image needs upscaling to avoid pixelated results.';
  }

  // Calculate optimal print size at 300 DPI
  const printSizeAtOptimalDPI = {
    width: Number((imageWidth / 300).toFixed(2)),
    height: Number((imageHeight / 300).toFixed(2)),
  };

  return {
    horizontalDPI,
    verticalDPI,
    averageDPI,
    isHighQuality: averageDPI >= 300,
    qualityLevel,
    recommendation,
    printSizeAtOptimalDPI,
  };
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Format DPI result for display
 */
export function formatDPIResult(result: DPICalculationResult): string {
  return `${result.averageDPI} DPI`;
}

/**
 * Get quality badge color based on DPI
 */
export function getQualityColor(
  qualityLevel: DPICalculationResult['qualityLevel']
): string {
  switch (qualityLevel) {
    case 'excellent':
      return 'green';
    case 'good':
      return 'blue';
    case 'fair':
      return 'yellow';
    case 'poor':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Calculate required pixels for a given print size at target DPI
 */
export function calculateRequiredPixels(
  printWidth: number,
  printHeight: number,
  targetDPI: number = 300
): {
  width: number;
  height: number;
  totalPixels: number;
} {
  const width = Math.round(printWidth * targetDPI);
  const height = Math.round(printHeight * targetDPI);

  return {
    width,
    height,
    totalPixels: width * height,
  };
}
