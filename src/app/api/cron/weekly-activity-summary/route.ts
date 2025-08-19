import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (add your cron secret verification here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Get the date range for the past week
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all active users who have logged in within the past month
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: activeUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_sign_in_at')
      .gte('last_sign_in_at', monthAgo.toISOString())
      .not('email', 'is', null);

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // Process each user
    for (const user of activeUsers || []) {
      try {
        // Get user's activity stats for the past week
        
        // Count logins (approximated by auth logs or session updates)
        const { count: loginsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('id', user.id)
          .gte('last_sign_in_at', weekAgo.toISOString());

        // Count images processed
        const { count: imagesProcessed } = await supabase
          .from('uploads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo.toISOString());

        // Count credits used
        const { data: creditTransactions } = await supabase
          .from('credit_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', weekAgo.toISOString())
          .lt('amount', 0); // Only deductions

        const creditsUsed = creditTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

        // Calculate storage used
        const { data: storageData } = await supabase
          .from('uploads')
          .select('file_size')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null);

        const totalBytes = storageData?.reduce((sum, u) => sum + (u.file_size || 0), 0) || 0;
        const storageUsed = formatBytes(totalBytes);

        // Get most used feature
        const { data: featureUsage } = await supabase
          .from('uploads')
          .select('processing_type')
          .eq('user_id', user.id)
          .gte('created_at', weekAgo.toISOString())
          .not('processing_type', 'is', null);

        const featureCounts = featureUsage?.reduce((acc, u) => {
          acc[u.processing_type] = (acc[u.processing_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const mostUsedFeature = Object.entries(featureCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

        // Only send email if there was activity
        if (imagesProcessed > 0 || creditsUsed > 0) {
          const emailSent = await emailService.sendAccountActivitySummary({
            email: user.email,
            userName: user.first_name,
            period: 'weekly',
            stats: {
              loginsCount: Math.max(1, loginsCount || 0), // At least 1 if they're active
              imagesProcessed: imagesProcessed || 0,
              creditsUsed,
              storageUsed,
              lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at) : undefined,
              mostUsedFeature: formatFeatureName(mostUsedFeature),
            },
          });

          if (emailSent) {
            emailsSent++;
          } else {
            emailsFailed++;
          }
        }
      } catch (error) {
        console.error(`Failed to process user ${user.id}:`, error);
        emailsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Weekly activity summaries sent`,
      stats: {
        totalUsers: activeUsers?.length || 0,
        emailsSent,
        emailsFailed,
      },
    });
  } catch (error) {
    console.error('Weekly activity summary cron error:', error);
    return NextResponse.json(
      { error: 'Failed to send weekly summaries' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatFeatureName(feature: string | null): string | undefined {
  if (!feature) return undefined;
  
  const featureNames: Record<string, string> = {
    'upscale': 'Image Upscaling',
    'background-removal': 'Background Removal',
    'vectorize': 'Vectorization',
    'generate': 'AI Image Generation',
    'edit': 'AI Image Editing',
  };
  
  return featureNames[feature] || feature;
}