import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const resourceType = searchParams.get('resource_type') || '';
    const adminId = searchParams.get('admin_id') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('admin_audit_logs')
      .select('*, profiles!admin_audit_logs_admin_id_fkey(email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .offset(offset);

    // Apply filters
    if (search) {
      query = query.or(`action.ilike.%${search}%,resource_id.ilike.%${search}%,details::text.ilike.%${search}%`);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (adminId) {
      query = query.eq('admin_id', adminId);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      // Add 1 day to include the entire end date
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      query = query.lt('created_at', endDateTime.toISOString());
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    // Format logs with admin email
    const formattedLogs = logs?.map(log => ({
      ...log,
      admin_email: log.profiles?.email || null
    })) || [];

    return NextResponse.json({
      logs: formattedLogs,
      total: count || 0,
      page,
      limit
    });

  } catch (error) {
    console.error('Error in audit logs API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// Helper function to log admin actions (for use in other API routes)
export async function logAdminAction({
  adminId,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
  userAgent
}: {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details || {},
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (error) {
    console.error('Error in logAdminAction:', error);
  }
}