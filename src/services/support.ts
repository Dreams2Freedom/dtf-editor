import { createClientSupabaseClient } from '@/lib/supabase/client';
import type {
  SupportTicket,
  SupportMessage,
  CreateTicketData,
  CreateMessageData,
  TicketStatus,
  SupportNotification,
} from '@/types/support';

export class SupportService {
  private getSupabase() {
    // Use the same client creation as auth service for consistency
    return createClientSupabaseClient();
  }

  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    data: CreateTicketData
  ): Promise<SupportTicket> {
    try {
      const supabase = this.getSupabase();

      // Generate a temporary ticket number if the trigger doesn't work
      // Format: TKT-YYYYMM-XXXX
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      const ticketNumber = `TKT-${yearMonth}-${randomNum}`;

      // Create the ticket with explicit ticket_number
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          ticket_number: ticketNumber, // Provide ticket_number explicitly
          subject: data.subject,
          category: data.category,
          priority: data.priority || 'medium',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add the initial message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: userId,
          message: data.message,
          is_admin: false,
        });

      if (messageError) throw messageError;

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      // Send email notification to admin
      try {
        const { emailService } = await import('@/services/email');
        await emailService.sendSupportTicketNotification({
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          message: data.message,
          userEmail: profile?.email || 'unknown',
          userName: profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : undefined,
          createdAt: ticket.created_at,
        });
      } catch (emailError) {
        // Don't fail ticket creation if email fails
        console.error(
          'Failed to send support ticket notification email:',
          emailError
        );
      }

      // Notify admins via in-app notification bell
      try {
        await fetch('/api/support/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_ticket',
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
          }),
        });
      } catch {
        // Don't fail ticket creation if notification fails
      }

      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  /**
   * Get all tickets for a user
   */
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    try {
      const supabase = this.getSupabase();
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get message counts and check for admin replies for each ticket
      const ticketsWithCounts = await Promise.all(
        (tickets || []).map(async ticket => {
          // Get all messages for this ticket
          const { data: messages, error: msgError } = await supabase
            .from('support_messages')
            .select('id, is_admin')
            .eq('ticket_id', ticket.id);

          if (msgError) {
            console.error('Error fetching messages for ticket:', msgError);
            return {
              ...ticket,
              message_count: 0,
              has_admin_reply: false,
            };
          }

          const messageCount = messages?.length || 0;
          const hasAdminReply = messages?.some(msg => msg.is_admin) || false;

          return {
            ...ticket,
            message_count: messageCount,
            has_admin_reply: hasAdminReply,
          };
        })
      );

      return ticketsWithCounts;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  }

  /**
   * Get a single ticket with messages
   */
  async getTicket(ticketId: string): Promise<{
    ticket: SupportTicket;
    messages: SupportMessage[];
  }> {
    try {
      const supabase = this.getSupabase();

      // Get ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Get messages without join for now to avoid errors
      const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // For each message, get the user profile separately if needed
      const formattedMessages = await Promise.all(
        (messages || []).map(async msg => {
          if (msg.user_id && !msg.is_admin) {
            // Try to get user profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', msg.user_id)
              .single();

            return {
              ...msg,
              author: profile
                ? {
                    name:
                      `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                      'User',
                    email: profile.email,
                  }
                : {
                    name: 'User',
                    email: null,
                  },
            };
          } else if (msg.is_admin) {
            return {
              ...msg,
              author: {
                name: 'Support Team',
                email: 'support@dtfeditor.com',
              },
            };
          }
          return msg;
        })
      );

      return {
        ticket,
        messages: formattedMessages,
      };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(
    data: CreateMessageData,
    userId: string
  ): Promise<SupportMessage> {
    try {
      const supabase = this.getSupabase();

      const { data: message, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: data.ticket_id,
          user_id: userId,
          message: data.message,
          attachments: data.attachments || [],
          is_admin: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket status if it was waiting on user
      await supabase
        .from('support_tickets')
        .update({
          status: 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.ticket_id)
        .eq('status', 'waiting_on_user');

      // Get ticket details for email notification
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('ticket_number, subject')
        .eq('id', data.ticket_id)
        .single();

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      // Send email notification to admin about user reply
      if (ticket && profile) {
        try {
          const { emailService } = await import('@/services/email');
          await emailService.sendTicketReplyToAdmin({
            ticketNumber: ticket.ticket_number,
            userEmail: profile.email,
            userName: profile.first_name
              ? `${profile.first_name} ${profile.last_name || ''}`.trim()
              : undefined,
            userMessage: data.message,
            ticketSubject: ticket.subject,
          });
        } catch (emailError) {
          console.error('Failed to send user reply notification:', emailError);
          // Don't fail the message creation if email fails
        }
      }

      // Notify admins via in-app notification bell about user reply
      if (ticket) {
        try {
          await fetch('/api/support/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'reply',
              ticketId: data.ticket_id,
              ticketNumber: ticket.ticket_number,
              subject: ticket.subject,
            }),
          });
        } catch {
          // Don't fail if notification fails
        }
      }

      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus
  ): Promise<void> {
    try {
      const supabase = this.getSupabase();
      const updateData: Record<string, unknown> = { status };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<SupportNotification[]> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('support_notifications')
        .select(
          `
          *,
          support_tickets!inner (
            ticket_number,
            subject
          )
        `
        )
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(notif => ({
        ...notif,
        ticket: notif.support_tickets,
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(notificationIds: string[]): Promise<void> {
    try {
      const supabase = this.getSupabase();
      const { error } = await supabase
        .from('support_notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Search tickets
   * SEC-018: Sanitize query to prevent PostgREST filter injection via .or()
   */
  async searchTickets(userId: string, query: string): Promise<SupportTicket[]> {
    try {
      const supabase = this.getSupabase();
      // SEC-018: Escape special characters to prevent PostgREST filter injection.
      const sanitizedQuery = query
        .replace(/[\\%_]/g, c => `\\${c}`)  // Escape SQL LIKE wildcards
        .replace(/[,()]/g, '')               // Remove PostgREST filter delimiters
        .slice(0, 100);                       // Limit length

      const { data, error } = await supabase
        .from('support_tickets')
        .select()
        .eq('user_id', userId)
        .or(`subject.ilike.%${sanitizedQuery}%,ticket_number.ilike.%${sanitizedQuery}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching tickets:', error);
      throw error;
    }
  }
}

export const supportService = new SupportService();
