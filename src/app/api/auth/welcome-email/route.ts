import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emailService } from '@/services/email';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  console.log(
    '[WELCOME EMAIL API] Step 1: Request received at',
    new Date().toISOString()
  );

  try {
    const cookieStore = await cookies();

    // Try to get body data if provided (for signup flow)
    let body: any = {};
    try {
      body = await request.json();
      console.log(
        '[WELCOME EMAIL API] Step 2: Body parsed:',
        JSON.stringify(body)
      );
    } catch (e) {
      console.log('[WELCOME EMAIL API] Step 2: No body or invalid JSON');
      // Body might be empty, that's ok
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    let userId: string | undefined;
    let userEmail: string | undefined;

    // If userId and email are provided in body (signup flow), use them
    if (body.userId && body.email) {
      console.log(
        '[WELCOME EMAIL API] Step 3: Using provided userId and email from body'
      );
      userId = body.userId;
      userEmail = body.email;
    } else {
      console.log(
        '[WELCOME EMAIL API] Step 3: No userId/email in body, checking auth'
      );
      // Otherwise, get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      userId = user.id;
      userEmail = user.email!;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, subscription_plan')
      .eq('id', userId)
      .single();

    console.log('[WELCOME EMAIL API] Step 4: Sending email to:', userEmail);
    console.log('[WELCOME EMAIL API] Step 5: Email params:', {
      firstName: profile?.first_name || body.firstName,
      planName: profile?.subscription_plan || 'Free',
    });

    // Send welcome email
    const sent = await emailService.sendWelcomeEmail({
      email: userEmail,
      firstName: profile?.first_name || body.firstName,
      planName: profile?.subscription_plan || 'Free',
    });

    console.log('[WELCOME EMAIL API] Step 6: Email send result:', sent);

    if (!sent) {
      throw new Error('Failed to send welcome email');
    }

    console.log(
      '[WELCOME EMAIL API] Step 7: SUCCESS - Returning success response'
    );
    return NextResponse.json({
      success: true,
      message: 'Welcome email sent',
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'auth');
