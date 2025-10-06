import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePatch(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { first_name, last_name, company_name, phone } = body;

    // Update the user's profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name,
        last_name,
        company_name,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: data,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const PATCH = withRateLimit(handlePatch, 'api');
