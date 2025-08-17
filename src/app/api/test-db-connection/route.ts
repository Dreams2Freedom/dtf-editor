import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to count users in auth.users table
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Try to check if profiles table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%profile%');

    return NextResponse.json({
      success: true,
      profilesTableExists: !userError,
      profileCount: userCount || 0,
      userError: userError?.message || null,
      tables: tables || [],
      tableError: tableError?.message || null,
      supabaseUrl: supabaseUrl.replace(/https?:\/\//, '').split('.')[0] // Show project ref
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    });
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');