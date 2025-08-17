import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  // Simple test to verify deployment
  return NextResponse.json({
    message: 'Build test v3',
    timestamp: new Date().toISOString(),
    hasUpscaleSave: true,
    env: process.env.NODE_ENV
  });
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');