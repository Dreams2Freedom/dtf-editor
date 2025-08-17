import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: Request) {
  try {
    const { email, password } = await request.json();

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { 
          error: 'Missing environment variables',
          details: {
            url: !!supabaseUrl,
            key: !!supabaseAnonKey
          }
        },
        { status: 500 }
      );
    }

    // Create a fresh Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          status: error.status,
          details: {
            apiUrl: supabaseUrl,
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: !!data.session
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'server_error'
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'public');