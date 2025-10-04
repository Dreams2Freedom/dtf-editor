import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Validate session server-side
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role to bypass RLS and get affiliate record
    const serviceClient = createServiceRoleClient();

    const { data: affiliate, error: affiliateError } = await serviceClient
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (affiliateError) {
      if (affiliateError.code === 'PGRST116') {
        // No rows returned - not an affiliate
        return NextResponse.json(
          { error: 'Not an affiliate', affiliate: null },
          { status: 404 }
        );
      }
      throw affiliateError;
    }

    return NextResponse.json({ affiliate });
  } catch (error) {
    console.error('Error fetching affiliate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
