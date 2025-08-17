import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    // Check if the saveProcessedImage file exists in the build
    const utilsPath = path.join(process.cwd(), '.next/server/app/api/upscale/route.js');
    const fileExists = fs.existsSync(utilsPath);
    
    // Try to load the module
    let hasFunction = false;
    let functionContent = '';
    
    try {
      const upscaleRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/upscale/route.ts'), 'utf-8');
      hasFunction = upscaleRoute.includes('saveProcessedImageToGallery');
      functionContent = hasFunction ? 'Function found in source' : 'Function NOT found in source';
    } catch (e) {
      functionContent = 'Could not read source file';
    }
    
    return NextResponse.json({
      buildFileExists: fileExists,
      hasFunction,
      functionContent,
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');