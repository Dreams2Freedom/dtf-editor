import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/email';
import { env } from '@/config/env';

// This endpoint processes queued emails
// It can be called by a cron job or manually
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (you can add a secret key check here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET || 'your-secret-key'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching email queue:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch email queue' }, { status: 500 });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ message: 'No pending emails' });
    }

    console.log(`[EMAIL QUEUE] Processing ${pendingEmails.length} pending emails`);

    const results = [];
    for (const email of pendingEmails) {
      try {
        console.log(`[EMAIL QUEUE] Processing email ${email.id} of type ${email.email_type}`);
        
        let sent = false;
        
        // Process based on email type
        switch (email.email_type) {
          case 'welcome':
            // Get user profile for additional data
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, subscription_plan')
              .eq('id', email.user_id)
              .single();
            
            sent = await emailService.sendWelcomeEmail({
              email: email.email_to,
              firstName: profile?.first_name || email.email_data?.firstName || '',
              planName: profile?.subscription_plan || 'Free',
            });
            break;
            
          case 'subscription_confirmation':
            sent = await emailService.sendSubscriptionConfirmation({
              email: email.email_to,
              firstName: email.email_data?.firstName || '',
              planName: email.email_data?.planName || '',
              amount: email.email_data?.amount || 0,
              nextBillingDate: email.email_data?.nextBillingDate || '',
            });
            break;
            
          case 'payment_failed':
            sent = await emailService.sendPaymentFailedNotification({
              email: email.email_to,
              firstName: email.email_data?.firstName || '',
              planName: email.email_data?.planName || '',
              amount: email.email_data?.amount || 0,
              retryDate: email.email_data?.retryDate || '',
            });
            break;
            
          default:
            console.error(`Unknown email type: ${email.email_type}`);
            sent = false;
        }

        if (sent) {
          // Mark as sent
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', email.id);
          
          results.push({ id: email.id, status: 'sent' });
          console.log(`[EMAIL QUEUE] Email ${email.id} sent successfully`);
        } else {
          // Increment attempts
          await supabase
            .from('email_queue')
            .update({
              attempts: email.attempts + 1,
              error_message: 'Failed to send email',
            })
            .eq('id', email.id);
          
          results.push({ id: email.id, status: 'failed' });
          console.log(`[EMAIL QUEUE] Email ${email.id} failed to send`);
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        // Mark as failed and increment attempts
        await supabase
          .from('email_queue')
          .update({
            attempts: email.attempts + 1,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', email.id);
        
        results.push({ id: email.id, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Email queue processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process email queue' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Email queue processor',
    info: 'Use POST with proper authorization to process the queue',
  });
}