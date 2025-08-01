import nodemailer from 'nodemailer';
import mg from 'nodemailer-mailgun-transport';
import { env, isFeatureAvailable } from '@/config/env';

// Email template types
export type EmailTemplate = 
  | 'welcome'
  | 'purchase'
  | 'creditWarning'
  | 'subscription';

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

// Email service class
export class EmailService {
  private static instance: EmailService;
  private enabled: boolean;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.enabled = isFeatureAvailable('mailgun');
    if (this.enabled && env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
      // Initialize Mailgun transport
      const auth = {
        auth: {
          api_key: env.MAILGUN_API_KEY,
          domain: env.MAILGUN_DOMAIN,
        },
      };
      
      this.transporter = nodemailer.createTransport(mg(auth));
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
   * Send welcome email to new users
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
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
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send purchase confirmation email
   */
  async sendPurchaseEmail(data: PurchaseEmailData): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
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
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Purchase email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending purchase email:', error);
      return false;
    }
  }

  /**
   * Send credit expiration warning email
   */
  async sendCreditWarningEmail(data: CreditWarningEmailData): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
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
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Credit warning email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending credit warning email:', error);
      return false;
    }
  }

  /**
   * Send subscription notification email
   */
  async sendSubscriptionEmail(data: SubscriptionEmailData): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
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
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Subscription email sent:', info.messageId);
      return true;
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
    if (!this.enabled || !this.transporter) {
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
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Admin notification sent:', info.messageId);
      return true;
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
    if (!this.enabled || !this.transporter) {
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
        };

        await this.transporter.sendMail(mailOptions);
        sent++;
      } catch (error) {
        console.error(`Error sending email to ${recipient}:`, error);
        failed++;
      }
    }

    return { sent, failed };
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
}

// Export singleton instance
export const emailService = EmailService.getInstance();