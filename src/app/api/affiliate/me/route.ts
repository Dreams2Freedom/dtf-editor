import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get affiliate record for this user
    const { data: affiliate, error: affiliateError } = await supabase
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
