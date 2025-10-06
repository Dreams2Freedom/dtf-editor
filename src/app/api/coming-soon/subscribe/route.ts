import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'You are already on the waitlist!' },
        { status: 200 }
      );
    }

    // Add to waitlist
    const { error } = await supabase.from('waitlist').insert({
      email,
      source: 'coming-soon',
      created_at: new Date().toISOString(),
    });

    if (error) {
      // If table doesn't exist, create it
      if (error.code === '42P01') {
        // Create waitlist table
        await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS waitlist (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              source TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
          `,
        });

        // Try again
        await supabase.from('waitlist').insert({
          email,
          source: 'coming-soon',
          created_at: new Date().toISOString(),
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist!',
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');
