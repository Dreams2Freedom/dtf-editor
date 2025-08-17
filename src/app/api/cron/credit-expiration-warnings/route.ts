import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { emailService } from '@/services/email';
import { withRateLimit } from '@/lib/rate-limit';

// Create Supabase client with service role for admin operations
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function handleGet(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running credit expiration warning job...');

    // Get all users with expiring credits
    // Check for credits expiring in the next 14, 7, and 3 days
    const now = new Date();
    const criticalDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const infoDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    // Get all credit transactions with expiration dates
    const { data: expiringCredits, error } = await supabase
      .from('credit_transactions')
      .select(`
        user_id,
        credits_remaining,
        expires_at,
        profiles!inner (
          email,
          first_name,
          email_marketing_opted_out,
          email_transactional_opted_out
        )
      `)
      .gt('credits_remaining', 0)
      .lte('expires_at', infoDate.toISOString())
      .gte('expires_at', now.toISOString())
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('Error fetching expiring credits:', error);
      throw error;
    }

    console.log(`Found ${expiringCredits?.length || 0} users with expiring credits`);

    // Group credits by user
    const userCredits = new Map<string, {
      email: string;
      firstName?: string;
      totalExpiring: number;
      nearestExpiry: Date;
      urgencyLevel: 'critical' | 'warning' | 'info';
    }>();

    expiringCredits?.forEach((credit: any) => {
      const userId = credit.user_id;
      const expiryDate = new Date(credit.expires_at);
      
      // Skip if user has opted out of transactional emails
      if (credit.profiles.email_transactional_opted_out) {
        return;
      }

      // Determine urgency level
      let urgencyLevel: 'critical' | 'warning' | 'info' = 'info';
      if (expiryDate <= criticalDate) {
        urgencyLevel = 'critical';
      } else if (expiryDate <= warningDate) {
        urgencyLevel = 'warning';
      }

      const existing = userCredits.get(userId);
      if (existing) {
        existing.totalExpiring += credit.credits_remaining;
        if (expiryDate < existing.nearestExpiry) {
          existing.nearestExpiry = expiryDate;
          existing.urgencyLevel = urgencyLevel;
        }
      } else {
        userCredits.set(userId, {
          email: credit.profiles.email,
          firstName: credit.profiles.first_name,
          totalExpiring: credit.credits_remaining,
          nearestExpiry: expiryDate,
          urgencyLevel: urgencyLevel,
        });
      }
    });

    // Send emails to users with expiring credits
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const [userId, creditInfo] of userCredits) {
      try {
        // Check if we've already sent a warning for this expiry period
        const warningKey = `${userId}_${creditInfo.nearestExpiry.toISOString().split('T')[0]}`;
        
        // Check email_events to see if we already sent this warning
        const { data: existingWarning } = await supabase
          .from('email_events')
          .select('id')
          .eq('email', creditInfo.email)
          .eq('event_type', 'credit_warning')
          .eq('category', warningKey)
          .single();

        if (existingWarning) {
          console.log(`Already sent warning to ${creditInfo.email} for this expiry period`);
          continue;
        }

        // Send the warning email
        const success = await emailService.sendCreditWarningEmail({
          email: creditInfo.email,
          firstName: creditInfo.firstName,
          creditsRemaining: creditInfo.totalExpiring,
          expiryDate: creditInfo.nearestExpiry,
          urgencyLevel: creditInfo.urgencyLevel,
        });

        if (success) {
          emailsSent++;
          
          // Log that we sent this warning
          await supabase
            .from('email_events')
            .insert({
              email: creditInfo.email,
              event_type: 'credit_warning',
              timestamp: new Date().toISOString(),
              category: [warningKey],
              metadata: {
                credits_expiring: creditInfo.totalExpiring,
                expiry_date: creditInfo.nearestExpiry,
                urgency_level: creditInfo.urgencyLevel,
              },
            });
        } else {
          emailsFailed++;
        }
      } catch (error) {
        console.error(`Failed to send warning to ${creditInfo.email}:`, error);
        emailsFailed++;
      }
    }

    console.log(`Credit expiration warnings sent: ${emailsSent}, failed: ${emailsFailed}`);

    return NextResponse.json({
      success: true,
      emailsSent,
      emailsFailed,
      totalUsersWithExpiringCredits: userCredits.size,
    });
  } catch (error) {
    console.error('Error in credit expiration warning job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
async function handlePost(request: NextRequest) {
  return GET(request);
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');