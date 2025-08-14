import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Storage limits by plan (in bytes)
const STORAGE_LIMITS = {
  free: 100 * 1024 * 1024,        // 100 MB
  basic: 1024 * 1024 * 1024,      // 1 GB
  starter: 5 * 1024 * 1024 * 1024, // 5 GB
  professional: 10 * 1024 * 1024 * 1024 // 10 GB
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default: // 30d
        startDate.setDate(now.getDate() - 30);
    }

    // Get user's profile to determine plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    const userPlan = profile?.subscription_plan || 'free';
    const storageLimit = STORAGE_LIMITS[userPlan as keyof typeof STORAGE_LIMITS] || STORAGE_LIMITS.free;

    // Get all user's images
    const { data: allImages } = await supabase
      .from('processed_images')
      .select('*')
      .eq('user_id', user.id)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false });

    // Get images in date range
    const { data: rangeImages } = await supabase
      .from('processed_images')
      .select('*')
      .eq('user_id', user.id)
      .eq('processing_status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Calculate current usage
    const currentUsage = allImages?.reduce((sum, img) => sum + (img.file_size || 0), 0) || 0;
    const percentage = storageLimit > 0 ? (currentUsage / storageLimit) * 100 : 0;

    // Calculate growth trend
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    
    const lastMonthImages = allImages?.filter(img => 
      new Date(img.created_at) < lastMonthDate
    ) || [];
    
    const lastMonthUsage = lastMonthImages.reduce((sum, img) => sum + (img.file_size || 0), 0);
    const growthTrend = lastMonthUsage > 0 
      ? ((currentUsage - lastMonthUsage) / lastMonthUsage) * 100 
      : 0;

    // Calculate daily growth
    const dailyGrowth = [];
    for (let i = 0; i < (range === '7d' ? 7 : range === '90d' ? 90 : 30); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayImages = rangeImages?.filter(img => 
        img.created_at.startsWith(dateStr)
      ) || [];
      
      dailyGrowth.unshift({
        date: dateStr,
        size: dayImages.reduce((sum, img) => sum + (img.file_size || 0), 0),
        count: dayImages.length
      });
    }

    // Calculate monthly growth (last 6 months)
    const monthlyGrowth = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      
      const monthImages = allImages?.filter(img => 
        img.created_at.startsWith(monthStr)
      ) || [];
      
      monthlyGrowth.unshift({
        month: monthStr,
        size: monthImages.reduce((sum, img) => sum + (img.file_size || 0), 0),
        count: monthImages.length
      });
    }

    // Calculate breakdown by type
    const typeBreakdown = new Map<string, { size: number; count: number }>();
    
    allImages?.forEach(img => {
      const type = img.operation_type || 'unknown';
      const existing = typeBreakdown.get(type) || { size: 0, count: 0 };
      typeBreakdown.set(type, {
        size: existing.size + (img.file_size || 0),
        count: existing.count + 1
      });
    });

    const byType = Array.from(typeBreakdown.entries()).map(([type, data]) => ({
      type,
      size: data.size,
      count: data.count,
      percentage: currentUsage > 0 ? (data.size / currentUsage) * 100 : 0
    })).sort((a, b) => b.size - a.size);

    // Calculate breakdown by age
    const ageRanges = [
      { range: 'Last 7 days', days: 7 },
      { range: 'Last 30 days', days: 30 },
      { range: '30-90 days', days: 90, minDays: 30 },
      { range: 'Over 90 days', minDays: 90 }
    ];

    const byAge = ageRanges.map(({ range, days, minDays }) => {
      const maxDate = new Date();
      if (minDays) {
        maxDate.setDate(maxDate.getDate() - minDays);
      }
      
      const minDate = days ? new Date() : null;
      if (minDate && days) {
        minDate.setDate(minDate.getDate() - days);
      }

      const ageImages = allImages?.filter(img => {
        const imgDate = new Date(img.created_at);
        if (minDays && imgDate >= maxDate) return false;
        if (minDate && imgDate < minDate) return false;
        if (!minDays && days && imgDate >= minDate!) return false;
        return true;
      }) || [];

      return {
        range,
        size: ageImages.reduce((sum, img) => sum + (img.file_size || 0), 0),
        count: ageImages.length
      };
    });

    // Calculate predictions
    const recentDays = 7;
    const recentGrowth = dailyGrowth.slice(-recentDays);
    const avgDailyGrowth = recentGrowth.reduce((sum, d) => sum + d.size, 0) / recentDays;
    
    const remainingSpace = storageLimit - currentUsage;
    const daysUntilFull = avgDailyGrowth > 0 
      ? Math.floor(remainingSpace / avgDailyGrowth)
      : null;

    const projectedUsageNextMonth = currentUsage + (avgDailyGrowth * 30);

    // Generate recommendations
    let recommendedAction = 'Your storage usage is healthy.';
    
    if (percentage > 90) {
      recommendedAction = 'Critical: Your storage is almost full. Delete old images or upgrade immediately.';
    } else if (percentage > 70) {
      recommendedAction = 'Warning: Consider cleaning up old images or upgrading your plan soon.';
    } else if (daysUntilFull && daysUntilFull < 30) {
      recommendedAction = `At current usage rate, you'll run out of space in ${daysUntilFull} days.`;
    } else if (userPlan === 'free' && percentage > 50) {
      recommendedAction = 'Consider upgrading to a paid plan for more storage and permanent image retention.';
    }

    const analytics = {
      usage: {
        current: currentUsage,
        limit: storageLimit,
        percentage: Math.min(percentage, 100),
        trend: growthTrend
      },
      growth: {
        daily: dailyGrowth,
        monthly: monthlyGrowth
      },
      breakdown: {
        byType,
        byAge
      },
      predictions: {
        daysUntilFull,
        recommendedAction,
        projectedUsageNextMonth: Math.min(projectedUsageNextMonth, storageLimit)
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching storage analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage analytics' },
      { status: 500 }
    );
  }
}