# Supabase Auth Emails with Mailgun Setup Guide

This guide explains how to configure Supabase to use Mailgun for all authentication emails (password reset, email confirmation, magic links).

## Overview

By default, Supabase sends its own auth emails. To use Mailgun instead, we need to:

1. Disable Supabase's default email sending
2. Deploy an Edge Function to handle auth events
3. Configure webhooks to trigger our custom email sending

## Current Implementation

We've prepared the following components:

### 1. Email Service Methods

- `sendPasswordResetEmail()` - For password reset links
- `sendEmailConfirmation()` - For email verification
- `sendMagicLinkEmail()` - For passwordless login

### 2. Edge Function

Located at `supabase/functions/auth-email-handler/`

- Handles auth email events from Supabase
- Sends emails via Mailgun API
- Includes all email templates

### 3. API Endpoints (Alternative approach)

- `/api/auth/send-reset-email` - Custom password reset endpoint

## Setup Instructions

### Step 1: Configure Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Email Templates**
3. Disable email sending:
   - Go to **Settings > Auth**
   - Under "Email Auth", disable "Enable email confirmations"
   - Under "Email Auth", disable "Enable email change confirmations"

### Step 2: Deploy the Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy auth-email-handler

# Set environment variables
supabase secrets set MAILGUN_API_KEY=your-api-key
supabase secrets set MAILGUN_DOMAIN=mg.dtfeditor.com
supabase secrets set MAILGUN_FROM_EMAIL=noreply@mg.dtfeditor.com
supabase secrets set MAILGUN_FROM_NAME="DTF Editor"
supabase secrets set APP_URL=https://dtfeditor.com
```

### Step 3: Configure Auth Hooks

1. In Supabase dashboard, go to **Database > Webhooks**
2. Create a new webhook:
   - Name: `auth-email-handler`
   - Table: `auth.users`
   - Events: INSERT, UPDATE
   - Type: HTTP Request
   - URL: `https://your-project-ref.functions.supabase.co/auth-email-handler`
   - Headers: Add your function secret

### Step 4: Update Environment Variables

Add to your `.env.local`:

```env
# Supabase Edge Function URL
SUPABASE_FUNCTION_URL=https://your-project-ref.functions.supabase.co
```

## Testing

### Test Password Reset

```javascript
// In your app
const { error } = await authService.resetPassword('user@example.com');
```

### Test Email Confirmation

When a new user signs up, they'll receive a custom confirmation email.

### Test Magic Link

```javascript
// If implementing magic link login
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
});
```

## Current Status

✅ Email templates created
✅ Mailgun integration working
✅ Edge Function prepared
⏳ Needs deployment to Supabase
⏳ Needs webhook configuration

## Notes

- Auth emails have tracking disabled for security
- All auth emails are tagged for easy filtering in Mailgun
- Email templates match the app's design system
- Supports custom user metadata (firstName, etc.)

## Alternative: Direct API Approach

If you prefer not to use Edge Functions, you can:

1. Keep Supabase default emails disabled
2. Use the custom API endpoints (`/api/auth/send-reset-email`)
3. Handle all auth flows manually in your app

This gives you complete control but requires more implementation work.
