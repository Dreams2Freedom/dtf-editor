#!/usr/bin/env node

// Test email delivery to a specific email address

require('dotenv').config();

// Test recipient
const TEST_EMAIL = 'shannonherod@gmail.com';
const TEST_USER_NAME = 'Shannon';

console.log('📧 Email Delivery Test for DTF Editor\n');
console.log('   Recipient:', TEST_EMAIL);
console.log('   Mailgun Domain:', process.env.MAILGUN_DOMAIN);
console.log('   From:', process.env.MAILGUN_FROM_EMAIL || 'noreply@dtfeditor.com');
console.log('');

// Check Mailgun configuration
if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
  console.error('❌ Mailgun is not configured properly!');
  console.log('   MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('   MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'noreply@dtfeditor.com';
const MAILGUN_FROM_NAME = process.env.MAILGUN_FROM_NAME || 'DTF Editor';

async function sendTestEmail(type, subject, htmlContent, textContent) {
  const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
  
  const formData = new URLSearchParams();
  formData.append('from', `${MAILGUN_FROM_NAME} <${MAILGUN_FROM_EMAIL}>`);
  formData.append('to', TEST_EMAIL);
  formData.append('subject', subject);
  formData.append('html', htmlContent);
  formData.append('text', textContent);
  formData.append('o:tag', type);
  formData.append('o:tracking', 'true');
  formData.append('o:tracking-clicks', 'true');
  formData.append('o:tracking-opens', 'true');
  
  try {
    const response = await fetch(mailgunUrl, {
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
      return { success: true, id: result.id, message: result.message };
    } else {
      return { success: false, error: responseText, status: response.status };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runEmailTests() {
  console.log('🚀 Starting Email Tests...\n');
  
  const tests = [
    {
      name: 'Welcome Email',
      type: 'welcome-test',
      subject: '🎉 Welcome to DTF Editor! (Test Email)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #366494 0%, #5a8bc7 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to DTF Editor!</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Your AI-Powered Design Tool</p>
          </div>
          <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${TEST_USER_NAME}! 👋</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                <strong>This is a test email</strong> to verify that Mailgun is properly configured and delivering emails to your inbox.
              </p>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6;">
              If you're seeing this email, it means:
            </p>
            <ul style="color: #6b7280; line-height: 1.8;">
              <li>✅ Mailgun API is configured correctly</li>
              <li>✅ Email delivery is working</li>
              <li>✅ HTML formatting is preserved</li>
              <li>✅ Your inbox is receiving DTF Editor emails</li>
            </ul>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://dtfeditor.com/dashboard" style="display: inline-block; background: #E88B4B; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Go to Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Test timestamp: ${new Date().toLocaleString()}<br>
              Sent via Mailgun API
            </p>
          </div>
        </div>
      `,
      text: `Welcome to DTF Editor!\n\nHi ${TEST_USER_NAME}!\n\nThis is a test email to verify Mailgun is working.\n\nTimestamp: ${new Date().toLocaleString()}`
    },
    {
      name: 'Purchase Confirmation',
      type: 'purchase-test',
      subject: '✅ Purchase Confirmation - 10 Credits (Test)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Purchase Confirmed!</h1>
          </div>
          <div style="padding: 40px; background: white; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937;">Thank you for your purchase, ${TEST_USER_NAME}!</h2>
            
            <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #166534; margin-top: 0;">Order Details (Test)</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Product:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">10 Credits Package</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Amount:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">$9.99</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Credits Added:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">10</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4b5563;">Order ID:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-family: monospace;">TEST-${Date.now()}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6;">
              This is a test purchase confirmation email. In a real scenario, your credits would be immediately available in your account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://dtfeditor.com/process" style="background: #E88B4B; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Start Creating
              </a>
            </div>
          </div>
        </div>
      `,
      text: `Purchase Confirmed!\n\nThank you ${TEST_USER_NAME}!\n\nOrder: 10 Credits for $9.99\n\nThis is a test email.`
    },
    {
      name: 'Credit Warning',
      type: 'credit-warning-test',
      subject: '⚠️ Your Credits Are Expiring Soon (Test)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Credits Expiring Soon!</h1>
          </div>
          <div style="padding: 40px; background: white; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937;">Hi ${TEST_USER_NAME},</h2>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; font-weight: bold; margin: 0;">⏰ Time Sensitive</p>
              <p style="color: #78350f; margin: 8px 0 0 0;">
                You have <strong>5 credits</strong> that will expire on <strong>${new Date(Date.now() + 48*60*60*1000).toLocaleDateString()}</strong>
              </p>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6;">
              This is a test credit warning email. Don't let your credits go to waste!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://dtfeditor.com/process" style="background: #f59e0b; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Use Credits Now
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Test email sent: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      text: `Credits Expiring Soon!\n\nHi ${TEST_USER_NAME},\n\nYou have 5 credits expiring soon.\n\nThis is a test email.`
    }
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const test of tests) {
    process.stdout.write(`📤 Sending ${test.name}... `);
    
    const result = await sendTestEmail(test.type, test.subject, test.html, test.text);
    
    if (result.success) {
      console.log(`✅ Sent successfully!`);
      console.log(`   Message ID: ${result.id}`);
      console.log(`   Status: ${result.message}`);
      successCount++;
    } else {
      console.log(`❌ Failed to send`);
      console.log(`   Error: ${result.error}`);
      if (result.status) {
        console.log(`   Status Code: ${result.status}`);
      }
      failCount++;
    }
    
    console.log('');
    
    // Wait 1 second between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('📊 Test Results:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('');
  
  if (successCount > 0) {
    console.log('✨ Check your inbox at:', TEST_EMAIL);
    console.log('   - Look for emails from:', MAILGUN_FROM_EMAIL);
    console.log('   - Check spam folder if not in inbox');
    console.log('   - Emails should arrive within 1-2 minutes');
  }
  
  console.log('\n📱 How to Test Through the App:');
  console.log('');
  console.log('1. Welcome Email:');
  console.log('   - Sign up with shannonherod@gmail.com');
  console.log('   - Or trigger manually: curl -X POST http://localhost:3000/api/auth/welcome-email');
  console.log('');
  console.log('2. Purchase Confirmation:');
  console.log('   - Make a test purchase on https://dtfeditor.com/pricing');
  console.log('   - Use Stripe test card: 4242 4242 4242 4242');
  console.log('');
  console.log('3. Support Ticket Email:');
  console.log('   - Create a support ticket at https://dtfeditor.com/support');
  console.log('   - This sends an email to s2transfers@gmail.com');
  console.log('');
  console.log('4. Password Reset:');
  console.log('   - Go to https://dtfeditor.com/auth/login');
  console.log('   - Click "Forgot Password"');
  console.log('   - Enter shannonherod@gmail.com');
  
  console.log('\n🔍 Mailgun Dashboard:');
  console.log('   - Log into https://app.mailgun.com');
  console.log('   - Check Sending > Logs to see all sent emails');
  console.log('   - View delivery status, opens, and clicks');
}

// Run the tests
runEmailTests().catch(console.error);