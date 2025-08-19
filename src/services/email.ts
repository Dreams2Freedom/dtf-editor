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
    console.log('[EmailService] sendWelcomeEmail called with:', data);
    console.log('[EmailService] Enabled:', this.enabled);
    console.log('[EmailService] Has API Key:', !!this.mailgunApiKey);
    console.log('[EmailService] Mailgun Domain:', this.mailgunDomain);
    
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send welcome email to', data.email);
      console.log('EmailService: Skipping because enabled=', this.enabled, 'hasKey=', !!this.mailgunApiKey);
      return true;
    }

    try {
      console.log('[EmailService] Preparing welcome email for:', data.email);
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

      console.log('[EmailService] Calling sendMailgunEmail with options');
      const result = await this.sendMailgunEmail(mailOptions);
      console.log('[EmailService] sendMailgunEmail returned:', result);
      return result;
    } catch (error) {
      console.error('[EmailService] Error sending welcome email:', error);
      console.error('[EmailService] Error details:', (error as any)?.message);
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
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              ${this.getEmailLogoHeader()}
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName || 'there'},</h2>
                <div style="margin: 20px 0;">
                  ${content}
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">
                  This message was sent from DTF Editor admin team.<br>
                  If you have any questions, please contact support.
                </p>
              </div>
            </div>
          </body>
          </html>
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
   * Send ticket reply notification to user (when admin replies)
   */
  async sendTicketReplyToUser(data: {
    ticketNumber: string;
    userEmail: string;
    userName?: string;
    adminMessage: string;
    ticketSubject: string;
  }): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send ticket reply notification to', data.userEmail);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.userEmail,
        subject: `RE: ${data.ticketSubject} [${data.ticketNumber}]`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              ${this.getEmailLogoHeader()}
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-bottom: 20px;">Support Team Reply</h2>
                <p style="color: #666; font-size: 16px;">Hi ${data.userName || 'there'},</p>
                <p style="color: #666; font-size: 16px;">
                  Our support team has replied to your ticket <strong>#${data.ticketNumber}</strong>.
                </p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #366494; padding: 15px; margin: 20px 0;">
                  <p style="color: #333; margin: 0; white-space: pre-wrap;">${data.adminMessage}</p>
                </div>
                
                <div style="margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/support/${data.ticketNumber}" 
                     style="display: inline-block; background: #366494; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px;">
                    View Full Conversation
                  </a>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  You can reply directly to this email or click the button above to view the full conversation.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Support Team Reply\n\nHi ${data.userName || 'there'},\n\nOur support team has replied to your ticket #${data.ticketNumber}.\n\nReply:\n${data.adminMessage}\n\nView full conversation: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/support/${data.ticketNumber}\n\n© ${new Date().getFullYear()} DTF Editor`,
        'o:tag': ['support', 'ticket-reply', 'admin-reply'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:ticket_number': data.ticketNumber,
        'v:user_email': data.userEmail,
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending ticket reply notification to user:', error);
      return false;
    }
  }

  /**
   * Send ticket reply notification to admin (when user replies)
   */
  async sendTicketReplyToAdmin(data: {
    ticketNumber: string;
    userEmail: string;
    userName?: string;
    userMessage: string;
    ticketSubject: string;
  }): Promise<boolean> {
    const adminEmail = 's2transfers@gmail.com';
    
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send user reply notification to', adminEmail);
      return true;
    }

    try {
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: adminEmail,
        subject: `[USER REPLY] Ticket ${data.ticketNumber}: ${data.ticketSubject}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              ${this.getEmailLogoHeader()}
              <div style="padding: 40px 30px;">
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #856404; font-weight: bold;">User Reply</p>
                  <p style="margin: 4px 0 0 0; color: #856404;">Ticket #${data.ticketNumber} has a new reply from the user.</p>
                </div>
                
                <table style="width: 100%; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">From:</td>
                    <td style="padding: 8px 0; color: #333;">${data.userName || 'User'} (${data.userEmail})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Subject:</td>
                    <td style="padding: 8px 0; color: #333;">${data.ticketSubject}</td>
                  </tr>
                </table>
                
                <div style="background: #f8f9fa; border-left: 4px solid #366494; padding: 15px; margin: 20px 0;">
                  <p style="color: #333; margin: 0; white-space: pre-wrap;">${data.userMessage}</p>
                </div>
                
                <div style="margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/admin/support" 
                     style="display: inline-block; background: #366494; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px;">
                    View in Admin Panel
                  </a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `USER REPLY - Ticket #${data.ticketNumber}\n\nFrom: ${data.userName || 'User'} (${data.userEmail})\nSubject: ${data.ticketSubject}\n\nMessage:\n${data.userMessage}\n\nView in admin panel: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/admin/support\n\n© ${new Date().getFullYear()} DTF Editor`,
        'o:tag': ['support', 'ticket-reply', 'user-reply'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:ticket_number': data.ticketNumber,
        'v:user_email': data.userEmail,
        'h:Reply-To': data.userEmail,
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending ticket reply notification to admin:', error);
      return false;
    }
  }

  /**
   * Send failed payment notification
   */
  async sendPaymentFailedEmail(data: {
    email: string;
    firstName?: string;
    planName: string;
    attemptCount: number;
    nextRetryDate?: Date;
    amount: number;
  }): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send payment failed email to', data.email);
      return true;
    }

    try {
      const isFirstAttempt = data.attemptCount === 1;
      const subject = isFirstAttempt 
        ? `Payment Failed - Action Required`
        : `Payment Retry Failed - ${data.attemptCount} Attempts`;

      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              ${this.getEmailLogoHeader()}
              <div style="padding: 40px 30px;">
                <div style="background: #fee; border-left: 4px solid #dc3545; padding: 12px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #721c24; font-weight: bold;">Payment Failed</p>
                  <p style="margin: 4px 0 0 0; color: #721c24;">We were unable to process your payment for the ${data.planName} plan.</p>
                </div>
                
                <p style="color: #666; font-size: 16px;">Hi ${data.firstName || 'there'},</p>
                
                <p style="color: #666; font-size: 16px;">
                  We attempted to charge <strong>$${(data.amount / 100).toFixed(2)}</strong> for your DTF Editor ${data.planName} subscription, 
                  but the payment was declined.
                </p>
                
                ${data.nextRetryDate ? `
                  <p style="color: #666; font-size: 16px;">
                    <strong>We'll automatically retry the payment on ${data.nextRetryDate.toLocaleDateString()}.</strong>
                  </p>
                ` : ''}
                
                <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <h3 style="color: #333; margin-top: 0;">What you can do:</h3>
                  <ul style="color: #666; margin: 10px 0;">
                    <li>Update your payment method</li>
                    <li>Ensure sufficient funds are available</li>
                    <li>Contact your bank if the issue persists</li>
                  </ul>
                </div>
                
                <div style="margin-top: 30px; text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/dashboard" 
                     style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px;">
                    Update Payment Method
                  </a>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #999; font-size: 12px;">
                  If you continue to have issues, please contact our support team.
                  After ${data.attemptCount >= 3 ? 'multiple' : 'several'} failed attempts, 
                  your subscription may be cancelled.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Payment Failed\n\nHi ${data.firstName || 'there'},\n\nWe attempted to charge $${(data.amount / 100).toFixed(2)} for your DTF Editor ${data.planName} subscription, but the payment was declined.\n\n${data.nextRetryDate ? `We'll automatically retry the payment on ${data.nextRetryDate.toLocaleDateString()}.\n\n` : ''}What you can do:\n- Update your payment method\n- Ensure sufficient funds are available\n- Contact your bank if the issue persists\n\nUpdate your payment method: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/dashboard\n\n© ${new Date().getFullYear()} DTF Editor`,
        'o:tag': ['payment', 'payment-failed', `attempt-${data.attemptCount}`],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:attempt_count': data.attemptCount.toString(),
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending payment failed email:', error);
      return false;
    }
  }

  /**
   * Send monthly usage summary email
   */
  async sendMonthlyUsageSummary(data: {
    email: string;
    firstName?: string;
    month: string; // e.g., "January 2025"
    creditsUsed: number;
    creditsRemaining: number;
    imagesProcessed: number;
    popularFeatures: Array<{ feature: string; count: number }>;
    planName: string;
  }): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send monthly summary to', data.email);
      return true;
    }

    try {
      const topFeatures = data.popularFeatures.slice(0, 3);
      
      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject: `Your ${data.month} DTF Editor Summary`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              ${this.getEmailLogoHeader()}
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-bottom: 20px;">Your Monthly Summary</h2>
                <p style="color: #666; font-size: 16px;">Hi ${data.firstName || 'there'},</p>
                <p style="color: #666; font-size: 16px;">
                  Here's your DTF Editor activity summary for ${data.month}:
                </p>
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin: 20px 0;">
                  <div style="text-align: center;">
                    <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">
                      ${data.imagesProcessed}
                    </div>
                    <div style="font-size: 18px; opacity: 0.9;">
                      Images Processed
                    </div>
                  </div>
                  
                  <div style="display: flex; justify-content: space-around; margin-top: 30px;">
                    <div style="text-align: center;">
                      <div style="font-size: 24px; font-weight: bold;">${data.creditsUsed}</div>
                      <div style="font-size: 14px; opacity: 0.9;">Credits Used</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 24px; font-weight: bold;">${data.creditsRemaining}</div>
                      <div style="font-size: 14px; opacity: 0.9;">Credits Left</div>
                    </div>
                  </div>
                </div>
                
                ${topFeatures.length > 0 ? `
                  <div style="margin: 30px 0;">
                    <h3 style="color: #333; margin-bottom: 15px;">Your Most Used Features</h3>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 4px;">
                      ${topFeatures.map((feature, index) => `
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; ${index < topFeatures.length - 1 ? 'border-bottom: 1px solid #e9ecef;' : ''}">
                          <span style="color: #495057;">${feature.feature}</span>
                          <span style="color: #366494; font-weight: bold;">${feature.count} uses</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
                
                <div style="background: #e7f5ff; border-left: 4px solid #339af0; padding: 15px; margin: 20px 0;">
                  <p style="color: #1971c2; margin: 0;">
                    <strong>Your Plan:</strong> ${data.planName}<br>
                    ${data.creditsRemaining < 5 ? 
                      `<span style="color: #e03131;">⚠️ Running low on credits!</span>` : 
                      `You have ${data.creditsRemaining} credits remaining this month.`
                    }
                  </p>
                </div>
                
                ${data.creditsRemaining < 5 ? `
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/pricing" 
                       style="display: inline-block; background: #366494; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px;">
                      Get More Credits
                    </a>
                  </div>
                ` : ''}
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #999; font-size: 12px;">
                  This is your monthly activity summary. To view detailed analytics, visit your dashboard.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Your Monthly Summary\n\nHi ${data.firstName || 'there'},\n\nHere's your DTF Editor activity summary for ${data.month}:\n\nImages Processed: ${data.imagesProcessed}\nCredits Used: ${data.creditsUsed}\nCredits Remaining: ${data.creditsRemaining}\n\n${topFeatures.length > 0 ? `Most Used Features:\n${topFeatures.map(f => `- ${f.feature}: ${f.count} uses`).join('\n')}\n\n` : ''}Your Plan: ${data.planName}\n\nView your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/dashboard\n\n© ${new Date().getFullYear()} DTF Editor`,
        'o:tag': ['monthly-summary', 'engagement'],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:month': data.month,
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending monthly summary email:', error);
      return false;
    }
  }

  /**
   * Send processing error notification
   */
  async sendProcessingErrorEmail(data: {
    email: string;
    firstName?: string;
    errorType: 'upscale' | 'background_removal' | 'vectorize' | 'generation' | 'upload';
    errorMessage: string;
    creditsRefunded?: number;
    fileName?: string;
  }): Promise<boolean> {
    if (!this.enabled || !this.mailgunApiKey) {
      console.log('EmailService: Would send processing error email to', data.email);
      return true;
    }

    try {
      const errorTypeDisplay = {
        upscale: 'Image Upscaling',
        background_removal: 'Background Removal',
        vectorize: 'Vectorization',
        generation: 'AI Image Generation',
        upload: 'File Upload'
      };

      const mailOptions = {
        from: `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`,
        to: data.email,
        subject: `Processing Error - ${errorTypeDisplay[data.errorType]}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              ${this.getEmailLogoHeader()}
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-bottom: 20px;">Processing Error</h2>
                
                <div style="background: #fff5f5; border-left: 4px solid #fa5252; padding: 15px; margin-bottom: 20px;">
                  <p style="color: #c92a2a; margin: 0;">
                    We encountered an error while processing your ${errorTypeDisplay[data.errorType]} request.
                  </p>
                </div>
                
                <p style="color: #666; font-size: 16px;">Hi ${data.firstName || 'there'},</p>
                
                <p style="color: #666; font-size: 16px;">
                  Unfortunately, we were unable to complete your ${errorTypeDisplay[data.errorType]} request${data.fileName ? ` for "${data.fileName}"` : ''}.
                </p>
                
                <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #495057; margin: 0;">
                    <strong>Error Details:</strong><br>
                    ${data.errorMessage}
                  </p>
                </div>
                
                ${data.creditsRefunded ? `
                  <div style="background: #d3f9d8; border-left: 4px solid #51cf66; padding: 15px; margin: 20px 0;">
                    <p style="color: #2b8a3e; margin: 0;">
                      ✓ <strong>${data.creditsRefunded} credit${data.creditsRefunded > 1 ? 's have' : ' has'} been refunded</strong> to your account.
                    </p>
                  </div>
                ` : ''}
                
                <div style="margin: 30px 0;">
                  <h3 style="color: #333; margin-bottom: 15px;">What to do next:</h3>
                  <ul style="color: #666; line-height: 1.8;">
                    <li>Try uploading a different image</li>
                    <li>Ensure your image meets our requirements (max 10MB, JPG/PNG format)</li>
                    <li>Check your internet connection and try again</li>
                    <li>If the issue persists, contact our support team</li>
                  </ul>
                </div>
                
                <div style="margin-top: 30px; text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/support" 
                     style="display: inline-block; background: #366494; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
                    Contact Support
                  </a>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/process" 
                     style="display: inline-block; background: #fff; color: #366494; border: 2px solid #366494; padding: 10px 28px; text-decoration: none; border-radius: 4px;">
                    Try Again
                  </a>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #999; font-size: 12px;">
                  Error ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}<br>
                  Please reference this ID if you contact support.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Processing Error\n\nHi ${data.firstName || 'there'},\n\nWe encountered an error while processing your ${errorTypeDisplay[data.errorType]} request${data.fileName ? ` for "${data.fileName}"` : ''}.\n\nError Details:\n${data.errorMessage}\n\n${data.creditsRefunded ? `✓ ${data.creditsRefunded} credit${data.creditsRefunded > 1 ? 's have' : ' has'} been refunded to your account.\n\n` : ''}What to do next:\n- Try uploading a different image\n- Ensure your image meets our requirements\n- Check your internet connection\n- Contact support if the issue persists\n\nContact Support: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/support\nTry Again: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/process\n\n© ${new Date().getFullYear()} DTF Editor`,
        'o:tag': ['error', `error-${data.errorType}`],
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
        'v:user_email': data.email,
        'v:error_type': data.errorType,
      };

      return await this.sendMailgunEmail(mailOptions);
    } catch (error) {
      console.error('Error sending processing error email:', error);
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

  // Logo header for emails
  private getEmailLogoHeader(): string {
    return `
      <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 2px solid #366494;">
        <img src="${env.APP_URL}/logo-horizontal.png" alt="DTF Editor" style="height: 60px; max-width: 250px; width: auto;">
      </div>
    `;
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
          ${this.getEmailLogoHeader()}
          <div style="background-color: #366494; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Welcome!</h1>
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
          ${this.getEmailLogoHeader()}
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
          ${this.getEmailLogoHeader()}
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
          ${this.getEmailLogoHeader()}
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
          ${this.getEmailLogoHeader()}
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
          ${this.getEmailLogoHeader()}
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
          ${this.getEmailLogoHeader()}
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
            ${this.getEmailLogoHeader()}
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

  // Phase 3: Security & Account Management Emails

  async sendSecurityAlert(data: {
    email: string;
    userName?: string;
    alertType: 'new_login' | 'password_changed' | 'email_changed' | 'suspicious_activity';
    deviceInfo?: {
      browser?: string;
      os?: string;
      location?: string;
      ip?: string;
    };
    timestamp?: Date;
  }): Promise<boolean> {
    if (!isFeatureAvailable('mailgun')) {
      console.log('Security alert email (Mailgun not configured):', data);
      return false;
    }

    const alertMessages = {
      new_login: 'New Login Detected',
      password_changed: 'Password Changed',
      email_changed: 'Email Address Changed',
      suspicious_activity: 'Suspicious Activity Detected'
    };

    const alertActions = {
      new_login: 'A new login to your account was detected',
      password_changed: 'Your password has been successfully changed',
      email_changed: 'Your email address has been updated',
      suspicious_activity: 'We detected unusual activity on your account'
    };

    try {
      const formData = new FormData();
      formData.append('from', `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`);
      formData.append('to', data.email);
      formData.append('subject', `🔐 Security Alert: ${alertMessages[data.alertType]}`);
      
      const timestamp = data.timestamp || new Date();
      const deviceInfo = data.deviceInfo || {};
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .alert-box.warning { background: #fef3c7; border-color: #fde68a; }
            .device-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .device-info p { margin: 5px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Security Alert</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            
            <div class="alert-box ${data.alertType === 'suspicious_activity' ? '' : 'warning'}">
              <strong>${alertActions[data.alertType]}</strong>
              <p>Time: ${timestamp.toLocaleString()}</p>
            </div>

            ${deviceInfo.browser || deviceInfo.os || deviceInfo.location ? `
            <div class="device-info">
              <strong>Device Information:</strong>
              ${deviceInfo.browser ? `<p>Browser: ${deviceInfo.browser}</p>` : ''}
              ${deviceInfo.os ? `<p>Operating System: ${deviceInfo.os}</p>` : ''}
              ${deviceInfo.location ? `<p>Location: ${deviceInfo.location}</p>` : ''}
              ${deviceInfo.ip ? `<p>IP Address: ${deviceInfo.ip}</p>` : ''}
            </div>
            ` : ''}

            ${data.alertType === 'new_login' ? `
            <p><strong>Was this you?</strong></p>
            <p>If you recognize this activity, you can safely ignore this email.</p>
            <p>If you don't recognize this activity, please secure your account immediately:</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/security" class="button">Secure My Account</a>
            ` : ''}

            ${data.alertType === 'password_changed' ? `
            <p>If you made this change, no further action is needed.</p>
            <p><strong>If you didn't change your password, your account may be compromised.</strong> Please contact support immediately.</p>
            ` : ''}

            ${data.alertType === 'email_changed' ? `
            <p>Your email address has been updated. You'll now receive all account notifications at this address.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
            ` : ''}

            ${data.alertType === 'suspicious_activity' ? `
            <p>We've temporarily secured your account. Please verify your identity to continue using DTF Editor.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/verify" class="button">Verify My Account</a>
            ` : ''}

            <div class="footer">
              <p>This is an automated security notification from DTF Editor.</p>
              <p>© ${new Date().getFullYear()} DTF Editor. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      formData.append('html', htmlContent);
      formData.append('text', this.getSecurityAlertText(data));
      formData.append('o:tracking', 'yes');
      formData.append('o:tracking-clicks', 'yes');
      formData.append('o:tracking-opens', 'yes');
      formData.append('o:tag', `security-${data.alertType}`);

      const response = await fetch(
        `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send security alert: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending security alert:', error);
      return false;
    }
  }

  private getSecurityAlertText(data: any): string {
    const alertMessages = {
      new_login: 'New Login Detected',
      password_changed: 'Password Changed',
      email_changed: 'Email Address Changed',
      suspicious_activity: 'Suspicious Activity Detected'
    };

    const timestamp = data.timestamp || new Date();
    const deviceInfo = data.deviceInfo || {};

    return `
SECURITY ALERT: ${alertMessages[data.alertType]}

Hi ${data.userName || 'there'},

${data.alertType === 'new_login' ? 'A new login to your account was detected.' : ''}
${data.alertType === 'password_changed' ? 'Your password has been successfully changed.' : ''}
${data.alertType === 'email_changed' ? 'Your email address has been updated.' : ''}
${data.alertType === 'suspicious_activity' ? 'We detected unusual activity on your account.' : ''}

Time: ${timestamp.toLocaleString()}

${deviceInfo.browser ? `Browser: ${deviceInfo.browser}` : ''}
${deviceInfo.os ? `Operating System: ${deviceInfo.os}` : ''}
${deviceInfo.location ? `Location: ${deviceInfo.location}` : ''}
${deviceInfo.ip ? `IP Address: ${deviceInfo.ip}` : ''}

${data.alertType === 'new_login' ? `
If you recognize this activity, you can safely ignore this email.
If you don't recognize this activity, please secure your account at:
${process.env.NEXT_PUBLIC_APP_URL}/account/security
` : ''}

${data.alertType === 'password_changed' || data.alertType === 'email_changed' ? `
If you didn't make this change, please contact support immediately.
` : ''}

${data.alertType === 'suspicious_activity' ? `
We've temporarily secured your account. Please verify your identity at:
${process.env.NEXT_PUBLIC_APP_URL}/account/verify
` : ''}

© ${new Date().getFullYear()} DTF Editor
    `.trim();
  }

  async sendAccountActivitySummary(data: {
    email: string;
    userName?: string;
    period: 'weekly' | 'monthly';
    stats: {
      loginsCount: number;
      imagesProcessed: number;
      creditsUsed: number;
      storageUsed: string;
      lastLogin?: Date;
      mostUsedFeature?: string;
    };
  }): Promise<boolean> {
    if (!isFeatureAvailable('mailgun')) {
      console.log('Account activity summary email (Mailgun not configured):', data);
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('from', `${env.MAILGUN_FROM_NAME} <${env.MAILGUN_FROM_EMAIL}>`);
      formData.append('to', data.email);
      formData.append('subject', `📊 Your ${data.period === 'weekly' ? 'Weekly' : 'Monthly'} Activity Summary`);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .stat-box { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: bold; color: #6366f1; }
            .stat-label { color: #6b7280; margin-top: 5px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 ${data.period === 'weekly' ? 'Weekly' : 'Monthly'} Activity Summary</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            
            <p>Here's your ${data.period} activity summary for DTF Editor:</p>

            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${data.stats.loginsCount}</div>
                <div class="stat-label">Logins</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${data.stats.imagesProcessed}</div>
                <div class="stat-label">Images Processed</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${data.stats.creditsUsed}</div>
                <div class="stat-label">Credits Used</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${data.stats.storageUsed}</div>
                <div class="stat-label">Storage Used</div>
              </div>
            </div>

            ${data.stats.lastLogin ? `
            <p><strong>Last Login:</strong> ${data.stats.lastLogin.toLocaleString()}</p>
            ` : ''}

            ${data.stats.mostUsedFeature ? `
            <p><strong>Most Used Feature:</strong> ${data.stats.mostUsedFeature}</p>
            ` : ''}

            <p>Keep creating amazing DTF transfers!</p>

            <div class="footer">
              <p>You're receiving this because you're subscribed to activity summaries.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/account/preferences">Update Email Preferences</a></p>
              <p>© ${new Date().getFullYear()} DTF Editor. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      formData.append('html', htmlContent);
      formData.append('text', this.getAccountActivityText(data));
      formData.append('o:tracking', 'yes');
      formData.append('o:tracking-clicks', 'yes');
      formData.append('o:tracking-opens', 'yes');
      formData.append('o:tag', `activity-${data.period}`);

      const response = await fetch(
        `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send activity summary: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending activity summary:', error);
      return false;
    }
  }

  private getAccountActivityText(data: any): string {
    return `
${data.period === 'weekly' ? 'WEEKLY' : 'MONTHLY'} ACTIVITY SUMMARY

Hi ${data.userName || 'there'},

Here's your ${data.period} activity summary for DTF Editor:

• Logins: ${data.stats.loginsCount}
• Images Processed: ${data.stats.imagesProcessed}
• Credits Used: ${data.stats.creditsUsed}
• Storage Used: ${data.stats.storageUsed}

${data.stats.lastLogin ? `Last Login: ${data.stats.lastLogin.toLocaleString()}` : ''}
${data.stats.mostUsedFeature ? `Most Used Feature: ${data.stats.mostUsedFeature}` : ''}

Keep creating amazing DTF transfers!

---

Update email preferences:
${process.env.NEXT_PUBLIC_APP_URL}/account/preferences

© ${new Date().getFullYear()} DTF Editor
    `.trim();
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();