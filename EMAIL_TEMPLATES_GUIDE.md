# Email Templates Guide

This guide provides examples and instructions for setting up SendGrid email templates for DTF Editor.

## 🚀 Quick Start

1. **Set up SendGrid Account**
   - Sign up at https://sendgrid.com
   - Verify your sender domain
   - Create an API key with Mail Send permissions
   - Add the API key to your `.env` file

2. **Configure Environment Variables**
   ```env
   SENDGRID_API_KEY=your_api_key_here
   SENDGRID_FROM_EMAIL=noreply@dtfeditor.com
   SENDGRID_FROM_NAME=DTF Editor
   SENDGRID_WEBHOOK_PUBLIC_KEY=your_webhook_public_key
   
   # Template IDs (create these in SendGrid)
   SENDGRID_WELCOME_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxx
   SENDGRID_PURCHASE_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxx
   SENDGRID_CREDIT_WARNING_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxx
   SENDGRID_SUBSCRIPTION_TEMPLATE_ID=d-xxxxxxxxxxxxxxxxxx
   ```

## 📧 Email Templates

### 1. Welcome Email Template

**Subject:** Welcome to DTF Editor, {{firstName}}!

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background-color: #f9fafb; }
        .button { background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to DTF Editor!</h1>
        </div>
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            <p>Thank you for joining DTF Editor! We're excited to have you on board.</p>
            
            <p>With your {{planName}} account, you can:</p>
            <ul>
                <li>Upscale images with AI-powered enhancement</li>
                <li>Remove backgrounds with one click</li>
                <li>Convert images to scalable vectors</li>
                <li>Create print-ready DTF transfers</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="{{appUrl}}/dashboard" class="button">Get Started</a>
            </p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>The DTF Editor Team</p>
        </div>
        <div class="footer">
            <p>&copy; {{currentYear}} DTF Editor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

**Dynamic Variables:**
- `{{firstName}}` - User's first name (defaults to "there")
- `{{email}}` - User's email address
- `{{planName}}` - User's subscription plan
- `{{appUrl}}` - Application URL
- `{{currentYear}}` - Current year

### 2. Purchase Confirmation Template

**Subject:** Your DTF Editor {{#if purchaseType "subscription"}}Subscription{{else}}Purchase{{/if}} Confirmation

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Same styles as welcome email */
        .receipt { background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0; }
        .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .receipt-total { font-weight: bold; font-size: 18px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Thank You for Your Purchase!</h1>
        </div>
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            {{#if purchaseType "subscription"}}
            <p>Your subscription to the <strong>{{planName}}</strong> plan has been confirmed!</p>
            {{else}}
            <p>Your purchase of <strong>{{credits}} credits</strong> has been completed!</p>
            {{/if}}
            
            <div class="receipt">
                <h3>Order Details</h3>
                <div class="receipt-row">
                    <span>Type:</span>
                    <span>{{#if purchaseType "subscription"}}{{planName}} Subscription{{else}}{{credits}} Credits{{/if}}</span>
                </div>
                <div class="receipt-row receipt-total">
                    <span>Total:</span>
                    <span>${{amount}}</span>
                </div>
            </div>
            
            {{#if invoiceUrl}}
            <p style="text-align: center;">
                <a href="{{invoiceUrl}}" class="button">View Invoice</a>
            </p>
            {{/if}}
            
            <p>You can start using your {{#if purchaseType "subscription"}}subscription benefits{{else}}credits{{/if}} immediately.</p>
            
            <p style="text-align: center;">
                <a href="{{appUrl}}/dashboard" class="button">Go to Dashboard</a>
            </p>
            
            <p>Thank you for choosing DTF Editor!</p>
        </div>
        <div class="footer">
            <p>&copy; {{currentYear}} DTF Editor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

**Dynamic Variables:**
- `{{purchaseType}}` - "subscription" or "credits"
- `{{amount}}` - Purchase amount (formatted)
- `{{credits}}` - Number of credits (for credit purchases)
- `{{planName}}` - Plan name (for subscriptions)
- `{{invoiceUrl}}` - Link to Stripe invoice

### 3. Credit Expiration Warning Template

**Subject:** {{urgencyLevel}} Your DTF Editor Credits are Expiring Soon

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Base styles */
        .alert { padding: 20px; border-radius: 8px; margin: 20px 0; }
        .alert-critical { background-color: #fee; border: 1px solid #dc2626; color: #dc2626; }
        .alert-warning { background-color: #fef3c7; border: 1px solid #d97706; color: #d97706; }
        .alert-info { background-color: #dbeafe; border: 1px solid #2563eb; color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" style="background-color: {{urgencyColor}};">
            <h1>Credit Expiration Notice</h1>
        </div>
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            <div class="alert alert-{{urgencyLevel}}">
                <strong>⚠️ You have {{creditsRemaining}} credits expiring on {{expiryDate}}</strong>
            </div>
            
            <p>Don't let your credits go to waste! Use them before they expire to:</p>
            <ul>
                <li>Upscale images for crystal-clear prints</li>
                <li>Remove backgrounds professionally</li>
                <li>Create vector graphics for any size</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="{{appUrl}}/process" class="button">Use Credits Now</a>
            </p>
            
            <p><strong>Pro tip:</strong> Consider upgrading to a subscription plan for monthly credits that roll over for up to 2 months!</p>
            
            <p style="text-align: center;">
                <a href="{{appUrl}}/pricing" class="button" style="background-color: #10b981;">View Plans</a>
            </p>
        </div>
        <div class="footer">
            <p>&copy; {{currentYear}} DTF Editor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

**Dynamic Variables:**
- `{{urgencyLevel}}` - "critical", "warning", or "info"
- `{{urgencyColor}}` - Color based on urgency
- `{{creditsRemaining}}` - Number of expiring credits
- `{{expiryDate}}` - Expiration date

### 4. Subscription Update Template

**Subject:** Your DTF Editor Subscription has been {{actionText}}

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Base styles */
        .status { padding: 15px; background-color: #f3f4f6; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription {{actionText}}</h1>
        </div>
        <div class="content">
            <h2>Hi {{firstName}},</h2>
            
            {{#if action "created"}}
            <p>Welcome! Your <strong>{{planName}}</strong> subscription is now active.</p>
            {{/if}}
            
            {{#if action "updated"}}
            <p>Your subscription has been updated to the <strong>{{planName}}</strong> plan.</p>
            {{/if}}
            
            {{#if action "cancelled"}}
            <p>Your <strong>{{planName}}</strong> subscription has been cancelled.</p>
            <p>You'll continue to have access until the end of your current billing period.</p>
            {{/if}}
            
            {{#if action "paused"}}
            <p>Your <strong>{{planName}}</strong> subscription has been paused until <strong>{{pauseUntil}}</strong>.</p>
            <p>You won't be charged during the pause period, and your subscription will automatically resume on the date above.</p>
            {{/if}}
            
            {{#if action "resumed"}}
            <p>Your <strong>{{planName}}</strong> subscription has been resumed.</p>
            {{/if}}
            
            <div class="status">
                <strong>Subscription Details:</strong><br>
                Plan: {{planName}}<br>
                {{#if nextBillingDate}}Next billing date: {{nextBillingDate}}{{/if}}
            </div>
            
            <p style="text-align: center;">
                <a href="{{appUrl}}/settings?tab=billing" class="button">Manage Subscription</a>
            </p>
        </div>
        <div class="footer">
            <p>&copy; {{currentYear}} DTF Editor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

**Dynamic Variables:**
- `{{action}}` - "created", "updated", "cancelled", "paused", "resumed"
- `{{actionText}}` - Human-readable action text
- `{{planName}}` - Subscription plan name
- `{{nextBillingDate}}` - Next billing date
- `{{pauseUntil}}` - Date when subscription resumes (for paused)

## 🔧 Setting Up Templates in SendGrid

1. **Navigate to Email API → Dynamic Templates**
2. **Click "Create a Dynamic Template"**
3. **Name your template** (e.g., "DTF Editor Welcome Email")
4. **Add a Version** and select "Design Editor" or "Code Editor"
5. **Paste the HTML content** from above
6. **Save and note the Template ID** (starts with "d-")
7. **Add the Template ID to your .env file**

## 🧪 Testing Templates

Use SendGrid's test feature:
1. In the template editor, click "Test Your Email"
2. Add test data JSON:
   ```json
   {
     "firstName": "John",
     "email": "john@example.com",
     "planName": "Starter",
     "appUrl": "https://dtfeditor.com",
     "currentYear": 2025
   }
   ```
3. Send a test email to verify formatting

## 🎨 Design Guidelines

- **Primary Color:** #3b82f6 (Blue)
- **Success Color:** #10b981 (Green)
- **Warning Color:** #d97706 (Amber)
- **Error Color:** #dc2626 (Red)
- **Font:** Arial, sans-serif
- **Max Width:** 600px
- **Mobile Responsive:** Yes

## 🔐 Security Best Practices

1. **Verify Sender Domain** - Use domain authentication in SendGrid
2. **Use Template IDs** - Never hardcode email content
3. **Sanitize Variables** - SendGrid auto-escapes by default
4. **Include Unsubscribe** - Required for marketing emails
5. **Handle Bounces** - Set up webhook to process bounces

## 📊 Email Events to Track

- `delivered` - Email successfully delivered
- `open` - Email was opened
- `click` - Link was clicked
- `bounce` - Email bounced (update user profile)
- `spam` - Marked as spam (opt-out user)
- `unsubscribe` - User unsubscribed (update preferences)

## 🚨 Common Issues

1. **Emails going to spam**
   - Verify sender domain
   - Use proper authentication (SPF, DKIM, DMARC)
   - Avoid spam trigger words
   - Include unsubscribe links

2. **Template not found**
   - Check template ID in .env
   - Ensure template is active in SendGrid
   - Verify API key permissions

3. **Variables not replacing**
   - Check variable names match exactly
   - Use proper Handlebars syntax
   - Test with SendGrid's preview feature

## 📝 Webhook Configuration

1. In SendGrid, go to **Settings → Mail Settings → Event Webhooks**
2. Set **HTTP Post URL** to: `https://yourdomain.com/api/webhooks/sendgrid`
3. Select events to track (recommended: all)
4. Enable **Signature Verification**
5. Copy the **Verification Key** to `SENDGRID_WEBHOOK_PUBLIC_KEY`

## 🔄 Email Sending Flow

1. **User Action** → Triggers email need
2. **Email Service** → Prepares email data
3. **SendGrid API** → Sends using template
4. **Webhook** → Receives delivery status
5. **Database** → Updates email_events table

---

**Last Updated:** July 2025
**Version:** 1.0