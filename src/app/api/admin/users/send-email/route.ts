import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, email, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userIds, subject, body, includeUnsubscribe, testMode, template } =
      await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    if (!subject || !body) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    // Get user details
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, email_marketing_opted_out')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching user data:', usersError);
      return NextResponse.json(
        {
          error: 'Failed to fetch user data',
        },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found' },
        { status: 400 }
      );
    }

    // Log the email activity
    const { error: logError } = await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: testMode ? 'test_email_sent' : 'bulk_email_sent',
      details: {
        recipient_count: users.length,
        subject,
        template,
        test_mode: testMode,
        user_ids: testMode ? [] : userIds, // Don't log user IDs in test mode
      },
    });

    // In test mode, send a test email to the admin
    if (testMode) {
      const testSubject = `[TEST] ${subject}`;
      const testBody = `<div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-bottom: 20px;">
        <strong>⚠️ TEST EMAIL</strong><br>
        This email would be sent to ${users.length} user${users.length > 1 ? 's' : ''} in production.
      </div>
      ${body.replace(/\n/g, '<br>')}`;

      const success = await emailService.sendAdminNotificationEmail(
        profile.email,
        testSubject,
        testBody,
        profile.first_name
      );

      return NextResponse.json({
        success,
        sent: success ? 1 : 0,
        testMode: true,
        message: success
          ? 'Test email sent to admin'
          : 'Failed to send test email',
      });
    }

    // Send emails to selected users
    let sent = 0;
    let failed = 0;

    // Process emails one by one to handle personalization and errors
    for (const user of users) {
      try {
        // Skip users who have opted out of marketing emails
        if (user.email_marketing_opted_out && template === 'promotional') {
          console.log(`Skipping ${user.email} - opted out of marketing emails`);
          continue;
        }

        // NEW-19: Escape user data before inserting into HTML templates
        const escapeHtml = (str: string) =>
          str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const safeFirstName = escapeHtml(user.first_name || 'User');
        const safeLastName = escapeHtml(user.last_name || '');
        const safeEmail = escapeHtml(user.email);

        // Personalize the message with escaped values
        const personalizedBody = body
          .replace(/{{firstName}}/g, safeFirstName)
          .replace(/{{lastName}}/g, safeLastName)
          .replace(/{{email}}/g, safeEmail);

        const personalizedSubject = subject
          .replace(/{{firstName}}/g, safeFirstName)
          .replace(/{{lastName}}/g, safeLastName)
          .replace(/{{email}}/g, safeEmail);

        // Format body with HTML and optional unsubscribe
        let htmlBody = personalizedBody.replace(/\n/g, '<br>');

        if (includeUnsubscribe) {
          htmlBody += `
            <br><br>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              You received this email because you have an account with DTF Editor.<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=notifications" style="color: #666;">
                Manage email preferences
              </a>
            </p>
          `;
        }

        // Send the email
        const success = await emailService.sendAdminNotificationEmail(
          user.email,
          personalizedSubject,
          htmlBody,
          user.first_name
        );

        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Emails sent to ${sent} users${failed > 0 ? `, ${failed} failed` : ''}`,
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');
