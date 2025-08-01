import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const { new_email, password } = body;

    if (!new_email || !password) {
      return NextResponse.json(
        { error: 'New email and password are required' },
        { status: 400 }
      );
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 400 }
      );
    }

    // Update the email - this will send a confirmation email to both addresses
    const { error: updateError } = await supabase.auth.updateUser({
      email: new_email,
    });

    if (updateError) {
      console.error('Error updating email:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email. This email may already be in use.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Email update initiated. Please check both email addresses for confirmation.' 
    });
  } catch (error) {
    console.error('Email update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}