import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get total credits used
    const { data: usageData, error: usageError } = await supabase
      .from('credit_transactions')
      .select('amount, description')
      .eq('user_id', user.id)
      .eq('type', 'usage');

    if (usageError) {
      console.error('Error fetching usage:', usageError);
    }

    const totalUsed = usageData?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Get total credits purchased
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .in('type', ['purchase', 'subscription']);

    if (purchaseError) {
      console.error('Error fetching purchases:', purchaseError);
    }

    const totalPurchased = purchaseData?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Get most used operation
    const operationCounts: Record<string, number> = {};
    usageData?.forEach(transaction => {
      const operation = transaction.description?.toLowerCase() || 'unknown';
      if (operation.includes('upscale')) {
        operationCounts['upscale'] = (operationCounts['upscale'] || 0) + 1;
      } else if (operation.includes('background')) {
        operationCounts['background-removal'] = (operationCounts['background-removal'] || 0) + 1;
      } else if (operation.includes('vector')) {
        operationCounts['vectorize'] = (operationCounts['vectorize'] || 0) + 1;
      }
    });

    const mostUsedOperation = Object.entries(operationCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    // Calculate average monthly usage
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', user.id)
      .single();

    const accountAgeMonths = profile?.created_at 
      ? Math.max(1, (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 1;

    const averageUsagePerMonth = totalUsed / accountAgeMonths;

    // Get last purchase date
    const { data: lastPurchase } = await supabase
      .from('credit_transactions')
      .select('created_at')
      .eq('user_id', user.id)
      .in('type', ['purchase', 'subscription'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        totalUsed,
        totalPurchased,
        mostUsedOperation,
        averageUsagePerMonth,
        lastPurchaseDate: lastPurchase?.created_at || null
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    }, { status: 500 });
  }
}