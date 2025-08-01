import sgMail from '@sendgrid/mail';
import { env, isFeatureAvailable } from '@/config/env';

// Initialize SendGrid
if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

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

  constructor() {
    this.enabled = isFeatureAvailable('email');
    if (!this.enabled) {
      console.warn('EmailService: SendGrid API key not configured. Emails will not be sent.');
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
    if (!this.enabled) {
      console.log('EmailService: Would send welcome email to', data.email);
      return true;
    }

    try {
      const msg = {
        to: data.email,
        from: {
          email: env.SENDGRID_FROM_EMAIL,
          name: env.SENDGRID_FROM_NAME,
        },
        templateId: env.SENDGRID_WELCOME_TEMPLATE_ID,
        dynamicTemplateData: {
          firstName: data.firstName || 'there',
          email: data.email,
          planName: data.planName || 'Free',
          appUrl: env.APP_URL,
          currentYear: new Date().getFullYear(),
        },
      };

      if (!msg.templateId) {
        // Fallback to plain email if template not configured
        return this.sendPlainEmail(
          data.email,
          'Welcome to DTF Editor!',
          `Welcome ${data.firstName || 'there'}! Thank you for joining DTF Editor. Get started at ${env.APP_URL}/dashboard`
        );
      }

      await sgMail.send(msg);
      console.log('Welcome email sent to', data.email);
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
    if (!this.enabled) {
      console.log('EmailService: Would send purchase email to', data.email);
      return true;
    }

    try {
      const msg = {
        to: data.email,
        from: {
          email: env.SENDGRID_FROM_EMAIL,
          name: env.SENDGRID_FROM_NAME,
        },
        templateId: env.SENDGRID_PURCHASE_TEMPLATE_ID,
        dynamicTemplateData: {
          firstName: data.firstName || 'there',
          purchaseType: data.purchaseType,
          amount: (data.amount / 100).toFixed(2), // Convert cents to dollars
          credits: data.credits,
          planName: data.planName,
          invoiceUrl: data.invoiceUrl,
          appUrl: env.APP_URL,
          currentYear: new Date().getFullYear(),
        },
      };

      if (!msg.templateId) {
        // Fallback to plain email
        const subject = data.purchaseType === 'subscription' 
          ? `Subscription to ${data.planName} Plan Confirmed`
          : `Purchase of ${data.credits} Credits Confirmed`;
        
        const body = `Thank you for your purchase! Amount: $${(data.amount / 100).toFixed(2)}. View your dashboard at ${env.APP_URL}/dashboard`;
        
        return this.sendPlainEmail(data.email, subject, body);
      }

      await sgMail.send(msg);
      console.log('Purchase email sent to', data.email);
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
    if (!this.enabled) {
      console.log('EmailService: Would send credit warning email to', data.email);
      return true;
    }

    try {
      const msg = {
        to: data.email,
        from: {
          email: env.SENDGRID_FROM_EMAIL,
          name: env.SENDGRID_FROM_NAME,
        },
        templateId: env.SENDGRID_CREDIT_WARNING_TEMPLATE_ID,
        dynamicTemplateData: {
          firstName: data.firstName || 'there',
          creditsRemaining: data.creditsRemaining,
          expiryDate: data.expiryDate?.toLocaleDateString(),
          urgencyLevel: data.urgencyLevel,
          urgencyColor: data.urgencyLevel === 'critical' ? '#dc2626' : data.urgencyLevel === 'warning' ? '#d97706' : '#2563eb',
          appUrl: env.APP_URL,
          currentYear: new Date().getFullYear(),
        },
      };

      if (!msg.templateId) {
        // Fallback to plain email
        const urgencyText = data.urgencyLevel === 'critical' ? 'URGENT: ' : '';
        const subject = `${urgencyText}Your DTF Editor Credits are Expiring Soon`;
        const body = `You have ${data.creditsRemaining} credits expiring on ${data.expiryDate?.toLocaleDateString()}. Use them at ${env.APP_URL}/process`;
        
        return this.sendPlainEmail(data.email, subject, body);
      }

      await sgMail.send(msg);
      console.log('Credit warning email sent to', data.email);
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
    if (!this.enabled) {
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

      const msg = {
        to: data.email,
        from: {
          email: env.SENDGRID_FROM_EMAIL,
          name: env.SENDGRID_FROM_NAME,
        },
        templateId: env.SENDGRID_SUBSCRIPTION_TEMPLATE_ID,
        dynamicTemplateData: {
          firstName: data.firstName || 'there',
          action: data.action,
          actionText: actionText[data.action],
          planName: data.planName,
          nextBillingDate: data.nextBillingDate?.toLocaleDateString(),
          pauseUntil: data.pauseUntil?.toLocaleDateString(),
          appUrl: env.APP_URL,
          currentYear: new Date().getFullYear(),
        },
      };

      if (!msg.templateId) {
        // Fallback to plain email
        const subject = `Subscription ${actionText[data.action]}: ${data.planName} Plan`;
        let body = `Your ${data.planName} subscription has been ${actionText[data.action]}.`;
        
        if (data.nextBillingDate) {
          body += ` Next billing date: ${data.nextBillingDate.toLocaleDateString()}.`;
        }
        if (data.pauseUntil) {
          body += ` Paused until: ${data.pauseUntil.toLocaleDateString()}.`;
        }
        
        return this.sendPlainEmail(data.email, subject, body);
      }

      await sgMail.send(msg);
      console.log('Subscription email sent to', data.email);
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
    if (!this.enabled) {
      console.log('EmailService: Would send admin notification to', to);
      return true;
    }

    try {
      const msg = {
        to,
        from: {
          email: env.SENDGRID_FROM_EMAIL,
          name: env.SENDGRID_FROM_NAME,
        },
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

      await sgMail.send(msg);
      console.log('Admin notification sent to', to);
      return true;
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return false;
    }
  }

  /**
   * Send plain text email (fallback when templates not configured)
   */
  private async sendPlainEmail(to: string, subject: string, text: string): Promise<boolean> {
    try {
      const msg = {
        to,
        from: {
          email: env.SENDGRID_FROM_EMAIL,
          name: env.SENDGRID_FROM_NAME,
        },
        subject,
        text,
        html: `<p>${text}</p>`,
      };

      await sgMail.send(msg);
      console.log('Plain email sent to', to);
      return true;
    } catch (error) {
      console.error('Error sending plain email:', error);
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
    if (!this.enabled) {
      console.log('EmailService: Would send batch emails to', recipients.length, 'recipients');
      return { sent: recipients.length, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // SendGrid allows up to 1000 recipients per request
    const batchSize = 1000;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const msg = {
          to: batch,
          from: {
            email: env.SENDGRID_FROM_EMAIL,
            name: env.SENDGRID_FROM_NAME,
          },
          subject,
          html: content,
          text: content.replace(/<[^>]*>/g, ''),
          isMultiple: true,
        };

        await sgMail.sendMultiple(msg);
        sent += batch.length;
      } catch (error) {
        console.error('Error sending batch emails:', error);
        failed += batch.length;
      }
    }

    return { sent, failed };
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();