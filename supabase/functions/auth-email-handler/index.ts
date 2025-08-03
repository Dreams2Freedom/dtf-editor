import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')!;
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN')!;
const MAILGUN_FROM_EMAIL = Deno.env.get('MAILGUN_FROM_EMAIL')!;
const MAILGUN_FROM_NAME = Deno.env.get('MAILGUN_FROM_NAME')!;
const APP_URL = Deno.env.get('APP_URL')!;

interface EmailRequest {
  type: 'confirmation' | 'recovery' | 'magic_link';
  email: string;
  token?: string;
  redirect_url?: string;
  user_metadata?: {
    first_name?: string;
  };
}

serve(async (req: Request) => {
  try {
    // Verify the request is from Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const emailRequest: EmailRequest = await req.json();
    console.log('Processing email request:', emailRequest.type);

    let emailSent = false;
    const firstName = emailRequest.user_metadata?.first_name;

    switch (emailRequest.type) {
      case 'confirmation': {
        const confirmationLink = `${APP_URL}/auth/confirm?token=${emailRequest.token}`;
        emailSent = await sendEmail({
          to: emailRequest.email,
          subject: 'Confirm Your DTF Editor Email',
          html: getEmailConfirmationHTML({
            firstName,
            email: emailRequest.email,
            confirmationLink,
          }),
          text: getEmailConfirmationText({
            firstName,
            email: emailRequest.email,
            confirmationLink,
          }),
          tags: ['auth', 'email-confirmation'],
        });
        break;
      }

      case 'recovery': {
        const resetLink = `${APP_URL}/auth/reset-password?token=${emailRequest.token}`;
        emailSent = await sendEmail({
          to: emailRequest.email,
          subject: 'Reset Your DTF Editor Password',
          html: getPasswordResetHTML({
            firstName,
            email: emailRequest.email,
            resetLink,
            expiresIn: '1 hour',
          }),
          text: getPasswordResetText({
            firstName,
            email: emailRequest.email,
            resetLink,
            expiresIn: '1 hour',
          }),
          tags: ['auth', 'password-reset'],
        });
        break;
      }

      case 'magic_link': {
        const magicLink = `${APP_URL}/auth/magic-link?token=${emailRequest.token}`;
        emailSent = await sendEmail({
          to: emailRequest.email,
          subject: 'Your DTF Editor Login Link',
          html: getMagicLinkHTML({
            firstName,
            email: emailRequest.email,
            magicLink,
            expiresIn: '10 minutes',
          }),
          text: getMagicLinkText({
            firstName,
            email: emailRequest.email,
            magicLink,
            expiresIn: '10 minutes',
          }),
          tags: ['auth', 'magic-link'],
        });
        break;
      }

      default:
        return new Response('Invalid email type', { status: 400 });
    }

    if (!emailSent) {
      return new Response('Failed to send email', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in auth email handler:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags: string[];
}): Promise<boolean> {
  try {
    const form = new FormData();
    form.append('from', `${MAILGUN_FROM_NAME} <${MAILGUN_FROM_EMAIL}>`);
    form.append('to', options.to);
    form.append('subject', options.subject);
    form.append('html', options.html);
    form.append('text', options.text);
    
    // Add tags
    options.tags.forEach(tag => form.append('o:tag', tag));
    
    // Disable tracking for security emails
    form.append('o:tracking', 'false');
    form.append('o:tracking-clicks', 'false');
    form.append('o:tracking-opens', 'false');

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Mailgun error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Email templates (simplified versions)
function getEmailConfirmationHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #366494; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Confirm Your Email</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2>Welcome to DTF Editor!</h2>
        <p>Thanks for signing up! Please confirm your email address.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.confirmationLink}" style="background-color: #E88B4B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
            Confirm Email
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getEmailConfirmationText(data: any): string {
  return `Welcome to DTF Editor!\n\nConfirm your email: ${data.confirmationLink}`;
}

function getPasswordResetHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #366494; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Password Reset</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2>Hi ${data.firstName || 'there'}!</h2>
        <p>We received a request to reset your password.</p>
        <p>This link expires in ${data.expiresIn}.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" style="background-color: #E88B4B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getPasswordResetText(data: any): string {
  return `Password Reset\n\nReset your password: ${data.resetLink}\n\nExpires in ${data.expiresIn}`;
}

function getMagicLinkHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #366494; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Your Login Link</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2>Hi ${data.firstName || 'there'}!</h2>
        <p>Here's your secure login link.</p>
        <p>This link expires in ${data.expiresIn}.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.magicLink}" style="background-color: #E88B4B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
            Sign In
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getMagicLinkText(data: any): string {
  return `Your Login Link\n\nSign in: ${data.magicLink}\n\nExpires in ${data.expiresIn}`;
}