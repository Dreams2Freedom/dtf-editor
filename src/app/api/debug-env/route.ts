import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  // Only show in development or with special header
  const isDev = process.env.NODE_ENV === 'development';
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    envCheck: {
      CLIPPINGMAGIC_API_KEY: env.CLIPPINGMAGIC_API_KEY ? 'SET' : 'NOT SET',
      CLIPPINGMAGIC_API_SECRET: env.CLIPPINGMAGIC_API_SECRET ? 'SET' : 'NOT SET',
      DEEP_IMAGE_API_KEY: env.DEEP_IMAGE_API_KEY ? 'SET' : 'NOT SET',
      VECTORIZER_API_KEY: env.VECTORIZER_API_KEY ? 'SET' : 'NOT SET',
      VECTORIZER_API_SECRET: env.VECTORIZER_API_SECRET ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_APP_URL: env.APP_URL || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    },
    rawEnvCheck: isDev ? {
      CLIPPINGMAGIC_API_KEY: process.env.CLIPPINGMAGIC_API_KEY ? 'SET' : 'NOT SET',
      CLIPPINGMAGIC_API_SECRET: process.env.CLIPPINGMAGIC_API_SECRET ? 'SET' : 'NOT SET',
    } : 'Hidden in production'
  });
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');