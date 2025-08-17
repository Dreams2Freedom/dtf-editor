import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Get all cookies
  const allCookies = cookieStore.getAll();
  
  // Get admin session specifically
  const adminSession = cookieStore.get('admin_session');
  
  return NextResponse.json({
    allCookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
    adminSession: adminSession ? 'Found' : 'Not found',
    adminSessionSize: adminSession ? adminSession.value.length : 0,
    headers: Object.fromEntries(request.headers.entries())
  });
}

async function handlePost(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Test setting a cookie
  cookieStore.set('test-cookie', 'test-value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 // 1 hour
  });
  
  return NextResponse.json({
    message: 'Test cookie set',
    canReadItBack: !!cookieStore.get('test-cookie')
  });
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');