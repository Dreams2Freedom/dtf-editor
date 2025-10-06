# Mailgun Email Setup Guide

This guide explains how to set up and configure Mailgun for sending transactional emails in DTF Editor.

## Prerequisites

1. Mailgun account (sign up at [mailgun.com](https://www.mailgun.com))
2. Verified domain in Mailgun
3. API key from Mailgun dashboard

## Environment Variables

Add these to your `.env` file:

```env
# Mailgun Configuration
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
MAILGUN_FROM_NAME=DTF Editor
MAILGUN_WEBHOOK_SIGNING_KEY=your_webhook_signing_key_here
```

## Email Types

The DTF Editor sends the following transactional emails:

### 1. Welcome Email

- Sent when a new user signs up
- Contains getting started information
- Includes current plan details

### 2. Purchase Confirmation

- Sent after successful payment
- Includes purchase details (credits/subscription)
- Contains invoice link if available

### 3. Credit Expiration Warning

- Sent when credits are about to expire
- Three urgency levels: info, warning, critical
- Includes expiration date and remaining credits

### 4. Subscription Updates

- Sent for subscription changes (created, updated, cancelled, paused, resumed)
- Includes next billing date
- Shows pause duration if applicable

### 5. Admin Notifications

- Custom emails sent by admins to users
- Supports HTML content
- Personalized with user's name

## Email Templates

All email templates are inline HTML generated in the email service. To customize:

1. Open `src/services/email.ts`
2. Find the template methods:
   - `getWelcomeEmailHTML()`
   - `getPurchaseEmailHTML()`
   - `getCreditWarningEmailHTML()`
   - `getSubscriptionEmailHTML()`
3. Modify the HTML/CSS as needed

## Testing Emails

### Local Development

1. Set up your Mailgun credentials in `.env`
2. Use the test endpoints:

```bash
# Test welcome email
curl -X POST http://localhost:3000/api/auth/welcome-email \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test from admin panel
# Go to /admin/users and use "Send Email" button
```

### Mailgun Sandbox

For testing without a verified domain:

1. Use Mailgun's sandbox domain
2. Add authorized recipients in Mailgun dashboard
3. Update `MAILGUN_DOMAIN` to sandbox domain

## Email Triggers

Emails are automatically sent in these scenarios:

1. **User Signup** → Welcome email (via auth callback)
2. **Successful Payment** → Purchase confirmation (via Stripe webhook)
3. **Credit Expiration** → Warning emails (via cron job)
4. **Subscription Changes** → Update notifications (via API endpoints)

## Monitoring

### Mailgun Dashboard

Monitor email delivery at: https://app.mailgun.com/app/sending/domains/YOUR_DOMAIN

Key metrics:

- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Spam complaints

### Application Logs

Email sending is logged with:

- Success: "Welcome email sent: [messageId]"
- Failure: "Error sending welcome email: [error]"

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check API key is correct
   - Verify domain is active in Mailgun
   - Check logs for error messages

2. **Emails going to spam**
   - Verify SPF/DKIM records
   - Check sender reputation
   - Review email content for spam triggers

3. **Rate limiting**
   - Mailgun has sending limits based on plan
   - Implement retry logic for failed sends

### Debug Mode

Enable debug logging:

```typescript
// In email service constructor
console.log('Mailgun config:', {
  domain: env.MAILGUN_DOMAIN,
  apiKey: env.MAILGUN_API_KEY ? 'SET' : 'NOT SET',
});
```

## Migration from SendGrid

If migrating from SendGrid:

1. Update environment variables
2. Remove `@sendgrid/mail` dependency
3. Install `nodemailer` and `nodemailer-mailgun-transport`
4. Update webhook endpoints if using email events

## Cost Considerations

Mailgun pricing:

- First 1,000 emails/month free
- Pay-as-you-go after that
- Consider monthly plans for higher volume

## Security Best Practices

1. **API Key Security**
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys regularly

2. **Domain Verification**
   - Complete SPF, DKIM, and MX record setup
   - Enable DMARC for additional security

3. **Rate Limiting**
   - Implement application-level rate limiting
   - Monitor for unusual sending patterns

4. **Content Security**
   - Sanitize user input in admin emails
   - Use template literals carefully
   - Validate email addresses

## Support

For Mailgun-specific issues:

- Documentation: https://documentation.mailgun.com
- Support: https://help.mailgun.com

For DTF Editor email issues:

- Check application logs
- Review this guide
- Contact development team
