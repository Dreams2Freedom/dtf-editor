import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const now = new Date();
    
    // Check for credits expiring in different time windows
    const expirationWindows = [
      { days: 30, urgency: 'info' as const },
      { days: 7, urgency: 'warning' as const },
      { days: 0, urgency: 'critical' as const }, // Expired today
    ];

    let totalNotificationsSent = 0;
    const results = [];

    for (const window of expirationWindows) {
      // Calculate the date for this window
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + window.days);
      
      // Query for credits expiring within this window
      // We need to check credit_transactions table for purchased credits with expiry dates
      const { data: expiringCredits, error } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          user_id,
          amount,
          expires_at,
          transaction_type,
          profiles!inner(
            email,
            first_name,
            credits_remaining
          )
        `)
        .eq('transaction_type', 'purchase')
        .not('expires_at', 'is', null)
        .gte('expires_at', now.toISOString())
        .lte('expires_at', checkDate.toISOString())
        .gt('amount', 0); // Only check positive credit additions

      if (error) {
        console.error(`Error checking ${window.days}-day expiration window:`, error);
        continue;
      }

      // Group credits by user to send one email per user
      const userCredits = new Map();
      
      for (const credit of expiringCredits || []) {
        const userId = credit.user_id;
        if (!userCredits.has(userId)) {
          userCredits.set(userId, {
            email: credit.profiles.email,
            firstName: credit.profiles.first_name,
            creditsRemaining: credit.profiles.credits_remaining,
            expiringAmount: 0,
            earliestExpiry: credit.expires_at,
          });
        }
        
        const userData = userCredits.get(userId);
        userData.expiringAmount += credit.amount;
        
        // Track earliest expiry date
        if (new Date(credit.expires_at) < new Date(userData.earliestExpiry)) {
          userData.earliestExpiry = credit.expires_at;
        }
      }

      // Send notifications
      for (const [userId, userData] of userCredits) {
        // Check if we've already sent a notification for this window recently
        const notificationKey = `credit_expiry_${window.days}_${userId}`;
        
        // Check notification history (we'll track in a simple table or use metadata)
        const { data: recentNotification } = await supabase
          .from('email_notifications')
          .select('id, created_at')
          .eq('user_id', userId)
          .eq('notification_type', notificationKey)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Within last 7 days
          .single();

        if (recentNotification) {
          console.log(`Skipping notification for user ${userId} - already sent within 7 days`);
          continue;
        }

        try {
          // Send the email
          const emailSent = await emailService.sendCreditWarningEmail({
            email: userData.email,
            firstName: userData.firstName,
            creditsRemaining: userData.creditsRemaining,
            expiryDate: new Date(userData.earliestExpiry),
            urgencyLevel: window.urgency,
          });

          if (emailSent) {
            // Record that we sent this notification
            await supabase
              .from('email_notifications')
              .insert({
                user_id: userId,
                notification_type: notificationKey,
                email_sent_to: userData.email,
                metadata: {
                  urgency: window.urgency,
                  expiring_credits: userData.expiringAmount,
                  expiry_date: userData.earliestExpiry,
                }
              });

            totalNotificationsSent++;
            results.push({
              userId,
              email: userData.email,
              urgency: window.urgency,
              expiringCredits: userData.expiringAmount,
            });
          }
        } catch (emailError) {
          console.error(`Failed to send expiration warning to ${userData.email}:`, emailError);
        }
      }
    }

    // Also check for already expired credits and notify users
    const { data: expiredCredits, error: expiredError } = await supabase
      .from('credit_transactions')
      .select(`
        user_id,
        SUM(amount) as total_expired,
        profiles!inner(
          email,
          first_name,
          credits_remaining
        )
      `)
      .eq('transaction_type', 'purchase')
      .lt('expires_at', now.toISOString())
      .gt('amount', 0)
      .group('user_id');

    if (!expiredError && expiredCredits) {
      for (const record of expiredCredits) {
        // Clean up expired credits
        await supabase
          .from('credit_transactions')
          .update({ amount: 0, metadata: { expired: true, expired_at: now.toISOString() } })
          .eq('user_id', record.user_id)
          .lt('expires_at', now.toISOString());
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: totalNotificationsSent,
      results,
      timestamp: now.toISOString(),
    });

  } catch (error) {
    console.error('Credit expiration check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This endpoint should be called daily by a cron job
// Example cron expression: 0 9 * * * (daily at 9 AM)
export async function POST(request: NextRequest) {
  // Alternative endpoint for manual trigger from admin panel
  return GET(request);
}