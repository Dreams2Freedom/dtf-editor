# DTF Editor - Email Communication Plan

## Current Email Implementation Status

### ✅ **Implemented & Working**

1. **Welcome Email** ✅ (Just fixed!)
   - Sent when user signs up (both regular signup and DPI tool signup)
   - Template: `sendWelcomeEmail()`
   - Status: **NOW WORKING** - Added to signup flows

2. **Purchase Confirmation Email** ✅ 
   - Sent for credit purchases (pay-as-you-go)
   - Template: `sendPurchaseEmail()`
   - Triggered in: Stripe webhook for `payment_intent.succeeded`
   - Status: **WORKING**

3. **Support Ticket Creation** ✅
   - Admin notification sent to s2transfers@gmail.com when new ticket created
   - Template: `sendSupportTicketNotification()`
   - Status: **WORKING**

4. **Subscription Cancellation** ✅
   - Sent when user cancels subscription
   - Template: `sendSubscriptionEmail()` with action='cancelled'
   - Triggered in: `/api/subscription/cancel/route.ts`
   - Status: **WORKING**

5. **Subscription Pause** ✅
   - Sent when user pauses subscription
   - Template: `sendSubscriptionEmail()` with action='paused'
   - Triggered in: `/api/subscription/pause/route.ts`
   - Status: **WORKING**

### ✅ **Phase 2 Completed (Retention & Engagement)**

1. **Credit Warning Email** ✅
   - Template: `sendCreditWarningEmail()`
   - Cron job: `/api/cron/check-expiring-credits`
   - Sends warnings at 30 days, 7 days, and expiration
   - Status: **IMPLEMENTED**

2. **Monthly Usage Summary** ✅
   - Template: `sendMonthlyUsageSummary()`
   - Cron job: `/api/cron/monthly-summary`
   - Sends on 1st of each month with usage stats
   - Status: **IMPLEMENTED**

3. **Processing Error Notifications** ✅
   - Template: `sendProcessingErrorEmail()`
   - Notifies users when processing fails with credit refund info
   - Status: **IMPLEMENTED**

### ✅ **Phase 3 Completed (Security & Account Management)**

1. **Security Alert Emails** ✅
   - Template: `sendSecurityAlert()`
   - Triggered on: new login, password change, email change, suspicious activity
   - Includes device info (browser, OS, IP, location)
   - API endpoint: `/api/auth/security-alert`
   - Status: **IMPLEMENTED** - Integrated with login flow

2. **Account Activity Summaries** ✅
   - Template: `sendAccountActivitySummary()`
   - Cron job: `/api/cron/weekly-activity-summary`
   - Sends weekly summaries with usage stats
   - Includes: logins, images processed, credits used, storage
   - Status: **IMPLEMENTED**

### ⚠️ **Implemented But Not Connected**

These email templates exist but are NOT being called anywhere:

2. **Password Reset Email**
   - Template: `sendPasswordResetEmail()`
   - Should be sent when user requests password reset
   - Status: **NOT CONNECTED** (Supabase handles this by default)

3. **Email Confirmation**
   - Template: `sendEmailConfirmation()`
   - Should be sent to verify email address
   - Status: **NOT CONNECTED** (Supabase handles this by default)

4. **Magic Link Email**
   - Template: `sendMagicLinkEmail()`
   - For passwordless login
   - Status: **NOT CONNECTED**

### 🔴 **Missing Email Notifications**

These are critical touchpoints where we should be sending emails but aren't:

1. **Support Ticket Updates**
   - User notification when admin replies to their ticket
   - Admin notification when user replies
   - Status update notifications (resolved, waiting, etc.)

2. **Subscription Created/Upgraded**
   - Confirmation when user subscribes or upgrades plan
   - Doesn't trigger for initial subscription via Stripe checkout

3. **Subscription Renewal**
   - Monthly renewal confirmation
   - Failed payment notifications
   - Payment retry notifications

4. **Credit Expiration Warnings**
   - 30 days before expiration
   - 7 days before expiration
   - When credits expired

5. **Processing Errors**
   - When image processing fails and credits are refunded
   - When upload limits are exceeded

6. **Account Changes**
   - Email change confirmation
   - Password change notification
   - Profile update confirmation

## Recommended Implementation Priority

### Phase 1: Critical Business Communications (Week 1)

1. **Support Ticket Reply Notifications** 🔴 HIGH PRIORITY
   ```typescript
   // When admin replies to ticket
   async sendTicketReplyToUser(ticketId, adminMessage)
   
   // When user replies to ticket  
   async sendTicketReplyToAdmin(ticketId, userMessage)
   ```

2. **Subscription Creation Confirmation** 🔴 HIGH PRIORITY
   ```typescript
   // In Stripe webhook for subscription.created
   async sendSubscriptionEmail(action: 'created')
   ```

3. **Failed Payment Notifications** 🔴 HIGH PRIORITY
   ```typescript
   // In Stripe webhook for invoice.payment_failed
   async sendPaymentFailedEmail(attemptCount, nextRetryDate)
   ```

### Phase 2: Retention & Engagement (Week 2)

4. **Credit Expiration Warnings** 🟡 MEDIUM PRIORITY
   ```typescript
   // Cron job to check expiring credits daily
   async checkExpiringCredits()
   - 30 days before: sendCreditWarningEmail(urgencyLevel: 'info')
   - 7 days before: sendCreditWarningEmail(urgencyLevel: 'warning')
   - Expired: sendCreditWarningEmail(urgencyLevel: 'critical')
   ```

5. **Monthly Usage Summary** 🟡 MEDIUM PRIORITY
   ```typescript
   // Cron job on 1st of each month
   async sendMonthlyUsageSummary(creditsUsed, imagesProcessed, popularFeatures)
   ```

6. **Processing Error Notifications** 🟡 MEDIUM PRIORITY
   ```typescript
   // When processing fails
   async sendProcessingErrorEmail(errorType, creditsRefunded)
   ```

### Phase 3: Security & Account Management (Week 3)

7. **Password Reset Integration** 🟢 LOW PRIORITY
   - Currently handled by Supabase
   - Consider custom template for brand consistency

8. **Account Security Alerts** 🟢 LOW PRIORITY
   ```typescript
   async sendSecurityAlert(eventType: 'new_login' | 'password_changed' | 'email_changed')
   ```

## Implementation Checklist

### Immediate Actions Required:

- [ ] Add email notification to support ticket reply flow
- [ ] Add subscription creation email to Stripe webhook
- [ ] Implement failed payment email notifications
- [ ] Create cron job for credit expiration warnings
- [ ] Add processing error email notifications

### Email Template Updates Needed:

- [ ] Create ticket reply templates (user & admin)
- [ ] Create failed payment template
- [ ] Create monthly usage summary template
- [ ] Create processing error template
- [ ] Update all templates with consistent branding

### Testing Requirements:

- [ ] Test all email flows in development
- [ ] Verify Mailgun delivery logs
- [ ] Test email rendering across clients
- [ ] Implement email preview endpoint for admins

## Email Sending Best Practices

1. **Always send emails asynchronously** - Don't block user actions
2. **Log all email attempts** - Track successes and failures
3. **Implement retry logic** - For failed sends
4. **Use proper email tags** - For Mailgun analytics
5. **Include unsubscribe links** - For marketing emails (not transactional)
6. **Test with real email addresses** - Not just console logs

## Monitoring & Analytics

### Track These Metrics:
- Open rates per email type
- Click rates for CTAs
- Bounce rates
- Unsubscribe rates (for marketing emails)
- Support ticket response times

### Use Mailgun Dashboard For:
- Delivery logs
- Bounce management
- Suppression lists
- Email validation

## Next Steps

1. **Prioritize Phase 1** - Implement critical business communications
2. **Set up email testing endpoint** - For QA and debugging
3. **Create email preview page** - For admins to see all templates
4. **Implement email preferences** - Let users control what they receive
5. **Add email analytics tracking** - Monitor engagement

## Code Locations

- Email Service: `/src/services/email.ts`
- Email Templates: Within email service (should be extracted)
- Webhook Handler: `/src/app/api/webhooks/stripe/route.ts`
- Support Service: `/src/services/support.ts`
- Subscription APIs: `/src/app/api/subscription/`

## Environment Variables Required

```env
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=mg.dtfeditor.com
MAILGUN_FROM_EMAIL=noreply@mg.dtfeditor.com
MAILGUN_FROM_NAME=DTF Editor
```

All currently configured and working! ✅