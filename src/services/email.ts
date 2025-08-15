import { env, isFeatureAvailable } from '@/config/env';

// Email template types
export type EmailTemplate = 
  | 'welcome'
  | 'purchase'
  | 'creditWarning'
  | 'subscription'
  | 'passwordReset'
  | 'emailConfirmation'
  | 'magicLink'
  | 'supportTicket';

// Email data types for each template
export interface WelcomeEmailData {
  firstName?: string;
  email: string;
  planName?: string;
}

export interface PurchaseEmailData {
  firstName?: string;
  email: string;
  purchaseType: 'subscription' | 'credits';
  amount: number;
  credits?: number;
  planName?: string;
  invoiceUrl?: string;
}

export interface CreditWarningEmailData {
  firstName?: string;
  email: string;
  creditsRemaining: number;
  expiryDate?: Date;
  urgencyLevel: 'critical' | 'warning' | 'info';
}

export interface SubscriptionEmailData {
  firstName?: string;
  email: string;
  action: 'created' | 'updated' | 'cancelled' | 'paused' | 'resumed';
  planName: string;
  nextBillingDate?: Date;
  pauseUntil?: Date;
}

export interface PasswordResetEmailData {
  firstName?: string;
  email: string;
  resetLink: string;
  expiresIn?: string; // e.g., "1 hour"
}

export interface EmailConfirmationData {
  firstName?: string;
  email: string;
  confirmationLink: string;
}

export interface MagicLinkEmailData {
  firstName?: string;
  email: string;
  magicLink: string;
  expiresIn?: string; // e.g., "10 minutes"
}

export interface SupportTicketEmailData {
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  userEmail: string;
  userName?: string;
  createdAt: string;
}

// Email service class
export class EmailService {
  private static instance: EmailService;
  private enabled: boolean;
  private mailgunApiKey: string;
  private mailgunDomain: string;
  private mailgunUrl: string;

  constructor() {
    this.enabled = isFeatureAvailable('mailgun');
    this.mailgunApiKey = env.MAILGUN_API_KEY;
    this.mailgunDomain = env.MAILGUN_DOMAIN;
    this.mailgunUrl = `https://api.mailgun.net/v3/${this.mailgunDomain}/messages`;
    
    if (this.enabled && this.mailgunApiKey && this.mailgunDomain) {
      console.log('EmailService: Mailgun configured successfully');
    } else {
      console.warn('EmailService: Mailgun not configured. Emails will not be sent.');
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send email via Mailgun API
   */
  private async sendMailgunEmail(mailData: any): Promise<boolean> {
    try {
      const formData = new URLSearchParams();
      
      // Add basic fields
      formData.append('from', mailData.from);
      formData.append('to', mailData.to);
      formData.append('subject', mailData.subject);
      formData.append('html', mailData.html);
      formData.append('text', mailData.text);
      
      // Add Mailgun-specific options
      if (mailData['o:tag']) {
        mailData['o:tag'].forEach((tag: string) => {
          formData.append('o:tag', tag);
        });
      }
      if (mailData['o:tracking'] !== undefined) {
        formData.append('o:tracking', mailData['o:tracking'].toString());
      }
      if (mailData['o:tracking-clicks'] !== undefined) {
        formData.append('o:tracking-clicks', mailData['o:tracking-clicks'].toString());
      }
      if (mailData['o:tracking-opens'] !== undefined) {
        formData.append('o:tracking-opens', mailData['o:tracking-opens'].toString());
      }
      
      // Add custom variables
      Object.keys(mailData).forEach(key => {
        if (key.startsWith('v:')) {
          formData.append(key, mailData[key]);
        }
      });

      console.log('Sending email via Mailgun:', {
        to: mailData.to,
        subject: mailData.subject,
      });

      const auth = Buffer.from(`api:${this.mailgunApiKey}`).toString('base64');
      const response = await fetch(this.mailgunUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseText = await response.text();
      
      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log('Email sent successfully:', result.id);
        return true;
      } else {
        console.error('Mailgun API error:', response.status, responseText);
        return false;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send welcome email to', data.email);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject: 'Welcome to DTF Editor!',
        html: this.getWelcomeEmailHTML(data),
        text: this.getWelcomeEmailText(data),
        'o:tag': ['welcome', 'onboarding'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send purchase confirmation email
   */
  async sendPurchaseEmail(data: PurchaseEmailData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send purchase email to', data.email);
      return true;
    }

    try {
      const subject = data.purchaseType === 'subscription' 
        ? `Subscription to ${data.planName} Plan Confirmed`
        : `Purchase of ${data.credits} Credits Confirmed`;

      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject,
        html: this.getPurchaseEmailHTML(data),
        text: this.getPurchaseEmailText(data),
        'o:tag': [data.purchaseType === 'subscription' ? 'subscription-purchase' : 'credit-purchase', 'transaction'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
        'v:purchase_amount': (data.amount / 100).toFixed(2),
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending purchase email:', error);
      return false;
    }
  }

  /**
   * Send credit expiration warning email
   */
  async sendCreditWarningEmail(data: CreditWarningEmailData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send credit warning email to', data.email);
      return true;
    }

    try {
      const urgencyText = data.urgencyLevel === 'critical' ? 'URGENT: ' : '';
      const subject = `${urgencyText}Your DTF Editor Credits are Expiring Soon`;

      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject,
        html: this.getCreditWarningEmailHTML(data),
        text: this.getCreditWarningEmailText(data),
        'o:tag': ['credit-warning', `urgency-${data.urgencyLevel}`],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
        'v:credits_remaining': data.creditsRemaining.toString(),
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending credit warning email:', error);
      return false;
    }
  }

  /**
   * Send subscription notification email
   */
  async sendSubscriptionEmail(data: SubscriptionEmailData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send subscription email to', data.email);
      return true;
    }

    try {
      const actionText = {
        created: 'created',
        updated: 'updated',
        cancelled: 'cancelled',
        paused: 'paused',
        resumed: 'resumed',
      };

      const subject = `Subscription ${actionText[data.action]}: ${data.planName} Plan`;

      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject,
        html: this.getSubscriptionEmailHTML(data),
        text: this.getSubscriptionEmailText(data),
        'o:tag': ['subscription', `subscription-${data.action}`],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
        'v:plan_name': data.planName,
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending subscription email:', error);
      return false;
    }
  }

  /**
   * Send admin notification email to user
   */
  async sendAdminNotificationEmail(
    to: string,
    subject: string,
    content: string,
    firstName?: string
  ): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send admin notification to', to);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${firstName || 'there'},</h2>
            <div style="margin: 20px 0;">
              ${content}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              This message was sent from DTF Editor admin team.<br>
              If you have any questions, please contact support.
            </p>
          </div>
        `,
        text: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        'o:tag': ['admin-notification', 'manual'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': to,
        'v:user_name': firstName || 'User',
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return false;
    }
  }

  /**
   * Send batch emails (for future use)
   */
  async sendBatchEmails(
    recipients: string[],
    subject: string,
    content: string
  ): Promise<{ sent: number; failed: number }> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send batch emails to', recipients.length, 'recipients');
      return { sent: recipients.length, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Send emails individually for Mailgun
    for (const recipient of recipients) {
      try {
        const mailOptions = {
          from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
          to: recipient,
          subject,
          html: content,
          text: content.replace(/<[^>]*>/g, ''),
          'o:tag': ['batch-email', 'campaign'],
          'o:tracking': true,
          'o:tracking-clicks': true,
          'o:tracking-opens': true,
        };

        const success = await this.sendMailgunEmail(mailOptions);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error sending email to ${recipient}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send password reset email to', data.email);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject: 'Reset Your DTF Editor Password',
        html: this.getPasswordResetEmailHTML(data),
        text: this.getPasswordResetEmailText(data),
        'o:tag': ['auth', 'password-reset'],
        'o:tracking': false, // Disable tracking for security emails
        'o:tracking-clicks': false,
        'o:tracking-opens': false,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send email confirmation
   */
  async sendEmailConfirmation(data: EmailConfirmationData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send email confirmation to', data.email);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject: 'Confirm Your DTF Editor Email',
        html: this.getEmailConfirmationHTML(data),
        text: this.getEmailConfirmationText(data),
        'o:tag': ['auth', 'email-confirmation'],
        'o:tracking': false, // Disable tracking for security emails
        'o:tracking-clicks': false,
        'o:tracking-opens': false,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending email confirmation:', error);
      return false;
    }
  }

  /**
   * Send magic link email
   */
  async sendMagicLinkEmail(data: MagicLinkEmailData): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send magic link email to', data.email);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject: 'Your DTF Editor Login Link',
        html: this.getMagicLinkEmailHTML(data),
        text: this.getMagicLinkEmailText(data),
        'o:tag': ['auth', 'magic-link'],
        'o:tracking': false, // Disable tracking for security emails
        'o:tracking-clicks': false,
        'o:tracking-opens': false,
        'v:user_email': data.email,
        'v:user_name': data.firstName || 'User',
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending magic link email:', error);
      return false;
    }
  }

  /**
   * Send support ticket notification to admin
   */
  async sendSupportTicketNotification(data: SupportTicketEmailData): Promise<boolean> {
    // Always send to Shannon at s2transfers
    const adminEmail = 's2transfers@gmail.com';
    
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send support ticket notification to', adminEmail);
      console.log('Ticket details:', data);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: adminEmail,
        subject: `[${data.priority.toUpperCase()}] New Support Ticket: ${data.ticketNumber}`,
        html: this.getSupportTicketNotificationHTML(data),
        text: this.getSupportTicketNotificationText(data),
        'o:tag': ['support', 'ticket-notification'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:ticket_number': data.ticketNumber,
        'v:user_email': data.userEmail,
        'h:Reply-To': data.userEmail,
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending support ticket notification:', error);
      return false;
    }
  }

  // Email template HTML generators
  private getWelcomeEmailHTML(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DTF Editor</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Welcome to DTF Editor!</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${data.firstName || 'there'}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining DTF Editor. We're excited to have you on board!
            </p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You're currently on the <strong>${data.planName || 'Free'}</strong> plan. 
              ${data.planName === 'Free' ? 'You have 2 free credits per month to try our tools.' : ''}
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${env.APP_URL}/dashboard" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Get Started
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">
              Need help? Check out our <a href="${env.APP_URL}/help" style="color: #366494;">help center</a> or reply to this email.
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailText(data: WelcomeEmailData): string {
    return `
Welcome to DTF Editor!

Hi ${data.firstName || 'there'}!

Thank you for joining DTF Editor. We're excited to have you on board!

You're currently on the ${data.planName || 'Free'} plan. ${data.planName === 'Free' ? 'You have 2 free credits per month to try our tools.' : ''}

Get started at: ${env.APP_URL}/dashboard

Need help? Visit ${env.APP_URL}/help or reply to this email.

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  private getPurchaseEmailHTML(data: PurchaseEmailData): string {
    const amount = (data.amount / 100).toFixed(2);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Purchase Confirmed!</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Thank you for your purchase!</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Type:</strong> ${data.purchaseType === 'subscription' ? 'Subscription' : 'Credit Package'}</p>
              ${data.planName ? `<p style="margin: 5px 0;"><strong>Plan:</strong> ${data.planName}</p>` : ''}
              ${data.credits ? `<p style="margin: 5px 0;"><strong>Credits:</strong> ${data.credits}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Amount:</strong> $${amount}</p>
            </div>
            ${data.invoiceUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invoiceUrl}" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Invoice
                </a>
              </div>
            ` : ''}
            <p style="color: #666; line-height: 1.6;">
              Your credits are now available in your account. Start creating at <a href="${env.APP_URL}/process" style="color: #366494;">DTF Editor</a>.
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPurchaseEmailText(data: PurchaseEmailData): string {
    const amount = (data.amount / 100).toFixed(2);
    
    return `
Purchase Confirmed!

Thank you for your purchase!

Type: ${data.purchaseType === 'subscription' ? 'Subscription' : 'Credit Package'}
${data.planName ? `Plan: ${data.planName}` : ''}
${data.credits ? `Credits: ${data.credits}` : ''}
Amount: $${amount}

${data.invoiceUrl ? `View your invoice: ${data.invoiceUrl}` : ''}

Your credits are now available in your account. Start creating at ${env.APP_URL}/process

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  private getCreditWarningEmailHTML(data: CreditWarningEmailData): string {
    const urgencyColor = data.urgencyLevel === 'critical' ? '#dc2626' : data.urgencyLevel === 'warning' ? '#d97706' : '#2563eb';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Credit Expiration Warning</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: ${urgencyColor}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Credits Expiring Soon!</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${data.firstName || 'there'}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You have <strong style="color: ${urgencyColor};">${data.creditsRemaining} credits</strong> that will expire 
              ${data.expiryDate ? `on <strong>${data.expiryDate.toLocaleDateString()}</strong>` : 'soon'}.
            </p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Don't let your credits go to waste! Use them to create amazing DTF designs.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${env.APP_URL}/process" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Use Credits Now
              </a>
            </div>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getCreditWarningEmailText(data: CreditWarningEmailData): string {
    return `
Credits Expiring Soon!

Hi ${data.firstName || 'there'}!

You have ${data.creditsRemaining} credits that will expire ${data.expiryDate ? `on ${data.expiryDate.toLocaleDateString()}` : 'soon'}.

Don't let your credits go to waste! Use them to create amazing DTF designs.

Use your credits now: ${env.APP_URL}/process

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  private getSubscriptionEmailHTML(data: SubscriptionEmailData): string {
    const actionText = {
      created: 'created',
      updated: 'updated',
      cancelled: 'cancelled',
      paused: 'paused',
      resumed: 'resumed',
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription ${actionText[data.action]}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Subscription ${actionText[data.action]}!</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${data.firstName || 'there'}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your <strong>${data.planName}</strong> subscription has been ${actionText[data.action]}.
            </p>
            ${data.nextBillingDate ? `
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Next billing date: <strong>${data.nextBillingDate.toLocaleDateString()}</strong>
              </p>
            ` : ''}
            ${data.pauseUntil ? `
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Your subscription is paused until: <strong>${data.pauseUntil.toLocaleDateString()}</strong>
              </p>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${env.APP_URL}/settings" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Manage Subscription
              </a>
            </div>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getSubscriptionEmailText(data: SubscriptionEmailData): string {
    const actionText = {
      created: 'created',
      updated: 'updated',
      cancelled: 'cancelled',
      paused: 'paused',
      resumed: 'resumed',
    };
    
    return `
Subscription ${actionText[data.action]}!

Hi ${data.firstName || 'there'}!

Your ${data.planName} subscription has been ${actionText[data.action]}.

${data.nextBillingDate ? `Next billing date: ${data.nextBillingDate.toLocaleDateString()}` : ''}
${data.pauseUntil ? `Your subscription is paused until: ${data.pauseUntil.toLocaleDateString()}` : ''}

Manage your subscription: ${env.APP_URL}/settings

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  // Auth Email Templates
  private getPasswordResetEmailHTML(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${data.firstName || 'there'}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your DTF Editor account.
            </p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Click the button below to reset your password. This link will expire in ${data.expiresIn || '1 hour'}.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color: #366494; word-break: break-all;">${data.resetLink}</span>
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailText(data: PasswordResetEmailData): string {
    return `
Password Reset Request

Hi ${data.firstName || 'there'}!

We received a request to reset your password for your DTF Editor account.

To reset your password, visit this link:
${data.resetLink}

This link will expire in ${data.expiresIn || '1 hour'}.

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  private getEmailConfirmationHTML(data: EmailConfirmationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Confirm Your Email Address</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to DTF Editor!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thanks for signing up! Please confirm your email address to complete your registration.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.confirmationLink}" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Confirm Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color: #366494; word-break: break-all;">${data.confirmationLink}</span>
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getEmailConfirmationText(data: EmailConfirmationData): string {
    return `
Welcome to DTF Editor!

Thanks for signing up! Please confirm your email address to complete your registration.

Confirm your email by visiting this link:
${data.confirmationLink}

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  private getMagicLinkEmailHTML(data: MagicLinkEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Login Link</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Your Login Link</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${data.firstName || 'there'}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Here's your secure login link for DTF Editor.
            </p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This link will expire in ${data.expiresIn || '10 minutes'}.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.magicLink}" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Sign In
              </a>
            </div>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color: #366494; word-break: break-all;">${data.magicLink}</span>
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} DTF Editor. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getMagicLinkEmailText(data: MagicLinkEmailData): string {
    return `
Your Login Link

Hi ${data.firstName || 'there'}!

Here's your secure login link for DTF Editor.

Sign in by visiting this link:
${data.magicLink}

This link will expire in ${data.expiresIn || '10 minutes'}.

© ${new Date().getFullYear()} DTF Editor. All rights reserved.
    `.trim();
  }

  private getSupportTicketNotificationHTML(data: SupportTicketEmailData): string {
    const priorityColor = data.priority === 'urgent' ? '#ef4444' : 
                          data.priority === 'high' ? '#f97316' : 
                          data.priority === 'medium' ? '#eab308' : '#22c55e';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Ticket</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: #366494; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Support Ticket</h1>
            </div>
            
            <div style="padding: 30px;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px;">
                <p style="margin: 0; color: #92400e; font-weight: bold;">Action Required</p>
                <p style="margin: 4px 0 0 0; color: #78350f;">A new support ticket has been created and requires your attention.</p>
              </div>

              <div style="margin-bottom: 24px;">
                <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">Ticket Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Ticket Number:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">${data.ticketNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Priority:</td>
                    <td style="padding: 8px 0;">
                      <span style="display: inline-block; padding: 4px 12px; background: ${priorityColor}; color: white; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                        ${data.priority}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Category:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.category.replace('_', ' ')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subject:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${data.subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From:</td>
                    <td style="padding: 8px 0; color: #1f2937;">
                      ${data.userName || 'User'}<br>
                      <a href="mailto:${data.userEmail}" style="color: #366494; text-decoration: none;">${data.userEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Created:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${new Date(data.createdAt).toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 24px;">
                <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px;">Message</h3>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
                  <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
                </div>
              </div>

              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/admin/support" 
                   style="display: inline-block; background: #366494; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                  View Ticket in Admin Panel
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} DTF Editor. This is an automated notification.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `.trim();
  }

  private getSupportTicketNotificationText(data: SupportTicketEmailData): string {
    return `
NEW SUPPORT TICKET

Ticket Number: ${data.ticketNumber}
Priority: ${data.priority.toUpperCase()}
Category: ${data.category.replace('_', ' ')}

Subject: ${data.subject}

From: ${data.userName || 'User'} (${data.userEmail})
Created: ${new Date(data.createdAt).toLocaleString()}

Message:
${data.message}

---

View ticket in admin panel:
${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/admin/support

© ${new Date().getFullYear()} DTF Editor
    `.trim();
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();