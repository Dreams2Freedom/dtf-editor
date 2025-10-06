#!/usr/bin/env node

// Test all email templates in the application

require('dotenv').config();
const path = require('path');

// Test recipient - change this if needed
const TEST_EMAIL = 's2transfers@gmail.com';
const TEST_USER_NAME = 'Shannon';

// Import the email service (we'll simulate it since we can't directly import TS)
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL =
  process.env.MAILGUN_FROM_EMAIL || 'noreply@dtfeditor.com';
const MAILGUN_FROM_NAME = process.env.MAILGUN_FROM_NAME || 'DTF Editor';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com';

async function sendTestEmail(type, data) {
  const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

  const formData = new URLSearchParams();
  formData.append('from', `${MAILGUN_FROM_NAME} <${MAILGUN_FROM_EMAIL}>`);
  formData.append('to', TEST_EMAIL);
  formData.append('subject', data.subject);
  formData.append('html', data.html);
  formData.append('text', data.text);
  formData.append('o:tag', type);
  formData.append('o:tracking', 'true');

  const response = await fetch(mailgunUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseText = await response.text();

  if (response.ok) {
    const result = JSON.parse(responseText);
    return { success: true, id: result.id };
  } else {
    return { success: false, error: responseText };
  }
}

async function testAllEmails() {
  console.log('📧 Testing All Email Templates\n');
  console.log('   Recipient:', TEST_EMAIL);
  console.log('   From:', `${MAILGUN_FROM_NAME} <${MAILGUN_FROM_EMAIL}>`);
  console.log('');

  const tests = [
    {
      name: '1. Welcome Email',
      type: 'welcome',
      data: {
        subject: 'Welcome to DTF Editor!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #366494; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Welcome to DTF Editor!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333;">Hi ${TEST_USER_NAME}!</h2>
              <p style="color: #666; line-height: 1.6;">
                Thank you for joining DTF Editor. We're excited to have you on board!
              </p>
              <p style="color: #666; line-height: 1.6;">
                You're currently on the <strong>Free</strong> plan with 2 credits per month.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  Get Started
                </a>
              </div>
            </div>
          </div>
        `,
        text: `Welcome to DTF Editor!\n\nHi ${TEST_USER_NAME}!\n\nThank you for joining DTF Editor.`,
      },
    },
    {
      name: '2. Purchase Confirmation',
      type: 'purchase',
      data: {
        subject: 'Purchase Confirmed - 10 Credits',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #366494; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Purchase Confirmed!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333;">Thank you for your purchase!</h2>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
                <p><strong>Type:</strong> Credit Package</p>
                <p><strong>Credits:</strong> 10</p>
                <p><strong>Amount:</strong> $9.99</p>
              </div>
              <p style="color: #666; margin-top: 20px;">
                Your credits are now available in your account.
              </p>
            </div>
          </div>
        `,
        text: `Purchase Confirmed!\n\nType: Credit Package\nCredits: 10\nAmount: $9.99`,
      },
    },
    {
      name: '3. Credit Warning (Critical)',
      type: 'credit-warning-critical',
      data: {
        subject: 'URGENT: Your DTF Editor Credits are Expiring Soon',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Credits Expiring Soon!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333;">Hi ${TEST_USER_NAME}!</h2>
              <p style="color: #666; line-height: 1.6;">
                You have <strong style="color: #dc2626;">5 credits</strong> that will expire 
                on <strong>${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>.
              </p>
              <p style="color: #666;">Don't let your credits go to waste!</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/process" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  Use Credits Now
                </a>
              </div>
            </div>
          </div>
        `,
        text: `Credits Expiring Soon!\n\nYou have 5 credits expiring tomorrow.`,
      },
    },
    {
      name: '4. Subscription Created',
      type: 'subscription-created',
      data: {
        subject: 'Subscription Created: Basic Plan',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #366494; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Subscription Created!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333;">Hi ${TEST_USER_NAME}!</h2>
              <p style="color: #666; line-height: 1.6;">
                Your <strong>Basic</strong> subscription has been created.
              </p>
              <p style="color: #666;">
                Next billing date: <strong>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/settings" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  Manage Subscription
                </a>
              </div>
            </div>
          </div>
        `,
        text: `Subscription Created!\n\nYour Basic subscription has been created.`,
      },
    },
    {
      name: '5. Subscription Cancelled',
      type: 'subscription-cancelled',
      data: {
        subject: 'Subscription Cancelled',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #366494; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Subscription Cancelled</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333;">Hi ${TEST_USER_NAME}!</h2>
              <p style="color: #666; line-height: 1.6;">
                Your subscription has been cancelled. You'll continue to have access until the end of your billing period.
              </p>
              <p style="color: #666;">
                We're sorry to see you go! If you change your mind, you can reactivate anytime.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/pricing" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  View Plans
                </a>
              </div>
            </div>
          </div>
        `,
        text: `Subscription Cancelled\n\nYour subscription has been cancelled.`,
      },
    },
    {
      name: '6. Password Reset',
      type: 'password-reset',
      data: {
        subject: 'Reset Your DTF Editor Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #366494; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Password Reset Request</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333;">Hi ${TEST_USER_NAME}!</h2>
              <p style="color: #666; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <p style="color: #666;">This link will expire in 1 hour.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/reset-password?token=test123" style="display: inline-block; background-color: #E88B4B; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `Password Reset Request\n\nClick here to reset your password: ${APP_URL}/reset-password`,
      },
    },
    {
      name: '7. Support Ticket Notification (Admin)',
      type: 'support-ticket',
      data: {
        subject: '[URGENT] New Support Ticket: #SUP-2025-0001',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #366494; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Support Ticket</h1>
            </div>
            <div style="padding: 30px; background: white;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px;">
                <p style="margin: 0; color: #92400e; font-weight: bold;">Action Required</p>
                <p style="margin: 4px 0 0 0; color: #78350f;">A new support ticket requires your attention.</p>
              </div>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Ticket Number:</td>
                  <td style="padding: 8px 0; font-weight: bold;">SUP-2025-0001</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Priority:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                      URGENT
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Category:</td>
                  <td style="padding: 8px 0;">Technical Issue</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">From:</td>
                  <td style="padding: 8px 0;">${TEST_USER_NAME} (${TEST_EMAIL})</td>
                </tr>
              </table>
              <h3 style="color: #1f2937; margin-top: 20px;">Message</h3>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
                <p style="margin: 0; color: #374151;">
                  This is a test support ticket to verify the email notification system is working correctly.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `New Support Ticket\n\nTicket: SUP-2025-0001\nPriority: URGENT\nFrom: ${TEST_EMAIL}`,
      },
    },
  ];

  console.log(`📤 Sending ${tests.length} test emails...\n`);

  for (const test of tests) {
    process.stdout.write(`   ${test.name}... `);

    try {
      const result = await sendTestEmail(test.type, test.data);

      if (result.success) {
        console.log('✅ Sent');
      } else {
        console.log('❌ Failed');
        console.log(`      Error: ${result.error}`);
      }
    } catch (error) {
      console.log('❌ Error');
      console.log(`      ${error.message}`);
    }

    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✨ Email testing complete!');
  console.log(`\n📬 Check the inbox for: ${TEST_EMAIL}`);
  console.log('\n📋 Verify the following for each email:');
  console.log('   1. Subject line is correct');
  console.log('   2. HTML formatting displays properly');
  console.log('   3. Links are clickable and correct');
  console.log('   4. Colors and branding are consistent');
  console.log('   5. Text version is readable (if viewing plain text)');

  console.log('\n🎯 Next Steps:');
  console.log('   1. Test emails triggered by actual user actions');
  console.log('   2. Set up email tracking in Mailgun dashboard');
  console.log('   3. Configure domain authentication (SPF, DKIM, DMARC)');
  console.log('   4. Monitor delivery rates and bounces');
}

// Run the tests
testAllEmails().catch(console.error);
