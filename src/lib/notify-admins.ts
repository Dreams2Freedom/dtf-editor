import { createClient } from '@supabase/supabase-js';

/**
 * Creates a notification for all admin users.
 * Uses service role client so it can be called from any server context.
 */
export async function notifyAdmins(params: {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
}) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the notification record
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        target_audience: 'custom',
        priority: params.priority || 'normal',
        action_url: params.actionUrl,
        action_text: params.actionText,
        is_active: true,
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      console.error('Failed to create admin notification:', notifError?.message);
      return;
    }

    // Get all admin user IDs
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (!admins || admins.length === 0) return;

    // Create user_notifications entries for each admin
    const userNotifications = admins.map(admin => ({
      notification_id: notification.id,
      user_id: admin.id,
      is_read: false,
      is_dismissed: false,
    }));

    const { error: insertError } = await supabase
      .from('user_notifications')
      .insert(userNotifications);

    if (insertError) {
      console.error('Failed to distribute admin notification:', insertError.message);
    }
  } catch (error) {
    // Never let notification failures break the calling flow
    console.error('Error sending admin notification:', error);
  }
}

/**
 * Notify admins when a new support ticket is created
 */
export async function notifyAdminsOfNewTicket(params: {
  ticketId: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  priority?: string;
}) {
  const priorityLabel = params.priority === 'urgent' || params.priority === 'high'
    ? ` [${params.priority.toUpperCase()}]`
    : '';

  await notifyAdmins({
    title: `New Support Ticket${priorityLabel}`,
    message: `${params.senderName} (${params.senderEmail}): ${params.subject}`,
    type: params.priority === 'urgent' ? 'error' : 'info',
    priority: params.priority === 'urgent' ? 'urgent' : params.priority === 'high' ? 'high' : 'normal',
    actionUrl: `/admin/support/${params.ticketId}`,
    actionText: 'View Ticket',
  });
}

/**
 * Notify admins when a user replies to a support ticket
 */
export async function notifyAdminsOfTicketReply(params: {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  senderName: string;
}) {
  await notifyAdmins({
    title: `Reply on ${params.ticketNumber}`,
    message: `${params.senderName} replied to: ${params.subject}`,
    type: 'info',
    priority: 'normal',
    actionUrl: `/admin/support/${params.ticketId}`,
    actionText: 'View Ticket',
  });
}
