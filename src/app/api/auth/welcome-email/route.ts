import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { emailService } from '@/services/email';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    const cookieStore = await cookies();
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, subscription_plan')
      .eq('id', user.id)
      .single();

    // Send welcome email
    const sent = await emailService.sendWelcomeEmail({
      email: user.email!,
      firstName: profile?.first_name,
      planName: profile?.subscription_plan || 'Free',
    });

    if (!sent) {
      throw new Error('Failed to send welcome email');
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent'
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