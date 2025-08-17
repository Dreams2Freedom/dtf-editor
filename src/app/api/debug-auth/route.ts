import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  console.log('\n=== DEBUG AUTH ENDPOINT ===');
  
  try {
    // 1. Check cookies
    const cookiesList = request.cookies.getAll();
    console.log('1. All cookies:', cookiesList.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })));
    
    // 2. Check for Supabase specific cookies
    const supabaseCookies = cookiesList.filter(c => c.name.includes('sb-'));
    console.log('2. Supabase cookies found:', supabaseCookies.length);
    
    // 3. Create Supabase client
    const supabase = await createServerSupabaseClient();
    
    // 4. Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('3. Session exists:', !!session);
    console.log('4. Session error:', sessionError);
    
    // 5. Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('5. User exists:', !!user);
    console.log('6. User error:', userError);
    
    // 6. Check headers
    const authHeader = request.headers.get('authorization');
    console.log('7. Authorization header:', authHeader);
    
    return NextResponse.json({
      debug: {
        cookiesFound: cookiesList.length,
        supabaseCookiesFound: supabaseCookies.length,
        sessionExists: !!session,
        sessionError: sessionError?.message,
        userExists: !!user,
        userError: userError?.message,
        userId: user?.id,
        userEmail: user?.email,
        authHeader: !!authHeader,
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');