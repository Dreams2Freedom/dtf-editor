import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  // Test setting a simple cookie
  const response = NextResponse.json({
    success: true,
    message: 'Test cookie endpoint',
    timestamp: new Date().toISOString(),
  });

  // Set test cookie using response.cookies
  response.cookies.set('test_cookie', 'test_value_' + Date.now(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  // Also try setting via the cookies() function
  const cookieStore = await cookies();
  cookieStore.set('test_cookie_2', 'test_value_2_' + Date.now(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });

  return response;
}

async function handlePost(request: NextRequest) {
  // Read cookies to verify they were set
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  return NextResponse.json({
    success: true,
    cookies: allCookies.map(c => ({ name: c.name, value: c.value })),
  });
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'public');
