import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  return NextResponse.json({
    message: 'Redis test successful',
    timestamp: new Date().toISOString(),
  });
}

export const GET = withRateLimit(handler, 'api');
