import { NextResponse } from 'next/server';

export async function GET() {
  // Return a simple test to verify the endpoint works
  return NextResponse.json({
    message: 'Test endpoint working',
    hasSaveFunction: typeof import('@/utils/saveProcessedImage').then(m => m.saveProcessedImageToGallery) === 'object'
  });
}