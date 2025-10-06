import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const now = new Date();

    // Get the previous month's date range
    const firstDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Format month name (e.g., "January 2025")
    const monthName = firstDayLastMonth.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Get all active users with their profiles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_plan, credits_remaining')
      .not('subscription_status', 'eq', 'canceled');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    let totalEmailsSent = 0;
    const results = [];

    for (const user of users || []) {
      try {
        // Get credit transactions for the month
        const { data: transactions, error: transError } = await supabase
          .from('credit_transactions')
          .select('amount, transaction_type, description')
          .eq('user_id', user.id)
          .gte('created_at', firstDayLastMonth.toISOString())
          .lte('created_at', lastDayLastMonth.toISOString());

        if (transError) {
          console.error(
            `Error fetching transactions for user ${user.id}:`,
            transError
          );
          continue;
        }

        // Calculate credits used (negative transactions)
        const creditsUsed = Math.abs(
          transactions
            ?.filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
        );

        // Count images processed by feature
        const featureCounts = new Map<string, number>();

        transactions?.forEach(t => {
          if (t.amount < 0 && t.description) {
            // Extract feature from description (e.g., "Image upscaled" -> "Upscale")
            let feature = 'Other';
            if (t.description.toLowerCase().includes('upscale')) {
              feature = 'Upscale';
            } else if (t.description.toLowerCase().includes('background')) {
              feature = 'Background Removal';
            } else if (t.description.toLowerCase().includes('vector')) {
              feature = 'Vectorize';
            } else if (t.description.toLowerCase().includes('generat')) {
              feature = 'AI Generation';
            }

            featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
          }
        });

        const imagesProcessed = Array.from(featureCounts.values()).reduce(
          (sum, count) => sum + count,
          0
        );

        // Skip users with no activity
        if (imagesProcessed === 0) {
          console.log(
            `Skipping user ${user.email} - no activity in ${monthName}`
          );
          continue;
        }

        // Convert feature counts to array for email
        const popularFeatures = Array.from(featureCounts.entries())
          .map(([feature, count]) => ({ feature, count }))
          .sort((a, b) => b.count - a.count);

        // Check if we've already sent this month's summary
        const notificationKey = `monthly_summary_${firstDayLastMonth.getFullYear()}_${firstDayLastMonth.getMonth() + 1}`;
        const { data: existingNotification } = await supabase
          .from('email_notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', notificationKey)
          .single();

        if (existingNotification) {
          console.log(
            `Monthly summary already sent to ${user.email} for ${monthName}`
          );
          continue;
        }

        // Send the email
        const emailSent = await emailService.sendMonthlyUsageSummary({
          email: user.email,
          firstName: user.first_name,
          month: monthName,
          creditsUsed,
          creditsRemaining: user.credits_remaining || 0,
          imagesProcessed,
          popularFeatures,
          planName: user.subscription_plan || 'Free',
        });

        if (emailSent) {
          // Record that we sent this notification
          await supabase.from('email_notifications').insert({
            user_id: user.id,
            notification_type: notificationKey,
            email_sent_to: user.email,
            metadata: {
              month: monthName,
              credits_used: creditsUsed,
              images_processed: imagesProcessed,
              top_features: popularFeatures.slice(0, 3),
            },
          });

          totalEmailsSent++;
          results.push({
            email: user.email,
            month: monthName,
            imagesProcessed,
            creditsUsed,
          });
        }
      } catch (error) {
        console.error(
          `Failed to process monthly summary for ${user.email}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent: totalEmailsSent,
      month: monthName,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Monthly summary cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This should be called on the 1st of each month
// Cron expression: 0 0 1 * * (monthly at midnight on the 1st)
export async function POST(request: NextRequest) {
  return GET(request);
}
