import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin using simplified auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[Admin Users API] Admin user authenticated:', user.email);

    // Use service role client to bypass RLS for fetching all users
    const serviceClient = createServiceRoleClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const plan = searchParams.get('plan') || '';
    const userType = searchParams.get('userType') || 'all';
    // NEW-13: Allowlist for sortBy to prevent arbitrary column access
    const ALLOWED_SORT_COLUMNS = new Set([
      'created_at',
      'email',
      'full_name',
      'credits_remaining',
      'subscription_tier',
      'last_activity_at',
      'is_active',
      'is_admin',
    ]);
    const rawSortBy = searchParams.get('sort_by') || 'created_at';
    const sortBy = ALLOWED_SORT_COLUMNS.has(rawSortBy)
      ? rawSortBy
      : 'created_at';
    const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';

    // NEW-20: Enforce max pagination limit
    const rawLimit = parseInt(searchParams.get('limit') || '10');
    const safeLimit = Math.min(Math.max(rawLimit, 1), 100);

    // Build query using service client
    let query = serviceClient.from('profiles').select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'suspended') {
        query = query.eq('is_active', false);
      }
    }

    if (plan && plan !== 'all') {
      query = query.eq('subscription_plan', plan);
    }

    // Apply user type filter
    if (userType && userType !== 'all') {
      if (userType === 'paid') {
        // Any user with stripe_customer_id (has made a purchase)
        query = query.not('stripe_customer_id', 'is', null);
      } else if (userType === 'payasyougo') {
        // Users with stripe_customer_id but subscription_tier = 'free'
        query = query
          .not('stripe_customer_id', 'is', null)
          .eq('subscription_tier', 'free');
      } else if (userType === 'subscribers') {
        // Users with subscription_tier != 'free'
        query = query.not('subscription_tier', 'eq', 'free');
      } else if (userType === 'free') {
        // Users without stripe_customer_id (never purchased)
        query = query.is('stripe_customer_id', null);
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination (using safeLimit with max cap)
    const offset = (page - 1) * safeLimit;
    query = query.range(offset, offset + safeLimit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    console.log(
      `[Admin Users API] Found ${users?.length} users, total count: ${count}`
    );

    // Get additional stats for each user
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user: any) => {
        try {
          // Get total credits used from transactions using service client
          const { data: creditStats } = await serviceClient
            .from('credit_transactions')
            .select('amount')
            .eq('user_id', user.id);

          const totalCreditsUsed =
            creditStats?.reduce(
              (sum: number, t: any) =>
                t.amount < 0 ? sum + Math.abs(t.amount) : sum,
              0
            ) || 0;

          // Get processed images count - handle table not existing
          let imagesProcessed = 0;
          try {
            const { count } = await serviceClient
              .from('api_usage_logs')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('processing_status', 'success');
            imagesProcessed = count || 0;
          } catch (error) {
            // Table might not exist yet
            imagesProcessed = 0;
          }

          return {
            id: user.id,
            email: user.email,
            full_name:
              user.full_name ||
              (user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : null) ||
              'N/A',
            plan: user.subscription_plan || 'free',
            subscription_tier: user.subscription_tier || 'free',
            stripe_customer_id: user.stripe_customer_id || null,
            credits_remaining: user.credits_remaining || 0,
            total_credits_used: totalCreditsUsed,
            images_processed: imagesProcessed || 0,
            status: user.is_active !== false ? 'active' : 'suspended',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || user.updated_at,
          };
        } catch (enrichError) {
          console.error(
            `[Admin Users API] Error enriching user ${user.id}:`,
            enrichError
          );
          // Return basic user data if enrichment fails
          return {
            id: user.id,
            email: user.email,
            full_name:
              user.full_name ||
              (user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : null) ||
              'N/A',
            plan: user.subscription_plan || 'free',
            subscription_tier: user.subscription_tier || 'free',
            stripe_customer_id: user.stripe_customer_id || null,
            credits_remaining: user.credits_remaining || 0,
            total_credits_used: 0,
            images_processed: 0,
            status: user.is_active !== false ? 'active' : 'suspended',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || user.updated_at,
          };
        }
      })
    );

    // Calculate total pages
    const totalPages = Math.ceil((count || 0) / safeLimit);

    console.log(
      `[Admin Users API] Returning ${enrichedUsers.length} enriched users`
    );

    return NextResponse.json({
      users: enrichedUsers,
      total: count || 0,
      page,
      limit: safeLimit,
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
