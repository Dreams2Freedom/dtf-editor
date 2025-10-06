import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  // Return a simple test to verify the endpoint works
  return NextResponse.json({
    message: 'Test endpoint working',
    hasSaveFunction:
      typeof import('@/utils/saveProcessedImage').then(
        m => m.saveProcessedImageToGallery
      ) === 'object',
  });
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');
