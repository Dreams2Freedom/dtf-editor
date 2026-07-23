import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';

/**
 * Email-verification callback.
 *
 * New users receive a link to this route (built in /api/auth/signup and
 * /api/auth/resend-verification) containing a `token_hash` and `type`. We
 * verify the one-time token here, which confirms the user's email
 * (`email_confirmed_at` is set) and establishes their session cookies. Only
 * after this can they reach the dashboard/tools (enforced in middleware).
 *
 * Uses next/navigation `redirect()` (not NextResponse.redirect) so the session
 * cookies set by verifyOtp are flushed onto the redirect response — otherwise
 * the user would verify but land logged-out.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Where to send the user once verified. Internal paths only (no open redirect).
  const rawNext = searchParams.get('next') || '/auth/select-plan';
  const next = rawNext.startsWith('/') ? rawNext : '/auth/select-plan';

  if (!token_hash || !type) {
    redirect('/verify-email?error=invalid_link');
  }

  const supabase = await createServerSupabaseClient();
  let { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

  // A signup confirmation token_hash verifies under type 'signup' on current
  // Supabase, but older/edge configurations expect 'email'. Retry once with
  // 'email' if the first attempt fails (a failed verify does not consume the
  // token), so a valid link never dead-ends.
  if (error && type === 'signup') {
    ({ data, error } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash,
    }));
  }

  if (error) {
    console.error('[AUTH CONFIRM] verifyOtp failed:', error.message);
    redirect('/verify-email?error=expired');
  }

  // Send the welcome email now that the account is verified (real users only).
  // Awaited so it isn't dropped when the serverless function ends.
  if (type === 'signup' && data.user?.email) {
    const firstName =
      (data.user.user_metadata?.firstName as string | undefined) ||
      (data.user.user_metadata?.first_name as string | undefined) ||
      '';
    try {
      await emailService.sendWelcomeEmail({
        email: data.user.email,
        firstName,
        planName: 'Free',
      });
    } catch (err) {
      console.error('[AUTH CONFIRM] Welcome email failed:', err);
    }
  }

  redirect(next);
}
