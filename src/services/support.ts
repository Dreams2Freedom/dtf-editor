import { createClientSupabaseClient } from '@/lib/supabase/client';
import type { 
  SupportTicket, 
  SupportMessage, 
  CreateTicketData, 
  CreateMessageData,
  TicketStatus,
  SupportNotification
} from '@/types/support';

export class SupportService {
  private getSupabase() {
    // Use the same client creation as auth service for consistency
    return createClientSupabaseClient();
  }

  /**
   * Create a new support ticket
   */
  async createTicket(userId: string, data: CreateTicketData): Promise<SupportTicket> {
    try {
      const supabase = this.getSupabase();
      
      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject: data.subject,
          category: data.category,
          priority: data.priority || 'medium'
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
          is_admin: false
        });

      if (messageError) throw messageError;

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
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages!inner(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to include message count
      return (data || []).map(ticket => ({
        ...ticket,
        message_count: ticket.support_messages?.[0]?.count || 0
      }));
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
        .select()
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Format messages with author info
      const formattedMessages = (messages || []).map(msg => ({
        ...msg,
        author: msg.profiles ? {
          name: `${msg.profiles.first_name || ''} ${msg.profiles.last_name || ''}`.trim() || 'User',
          email: msg.profiles.email
        } : msg.is_admin ? {
          name: 'Support Team',
          email: 'support@dtfeditor.com'
        } : undefined
      }));

      return {
        ticket,
        messages: formattedMessages
      };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(data: CreateMessageData, userId: string): Promise<SupportMessage> {
    try {
      const supabase = this.getSupabase();
      
      const { data: message, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: data.ticket_id,
          user_id: userId,
          message: data.message,
          attachments: data.attachments || [],
          is_admin: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket status if it was waiting on user
      await supabase
        .from('support_tickets')
        .update({ 
          status: 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.ticket_id)
        .eq('status', 'waiting_on_user');

      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
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
        .select(`
          *,
          support_tickets!inner (
            ticket_number,
            subject
          )
        `)
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(notif => ({
        ...notif,
        ticket: notif.support_tickets
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
   */
  async searchTickets(userId: string, query: string): Promise<SupportTicket[]> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('support_tickets')
        .select()
        .eq('user_id', userId)
        .or(`subject.ilike.%${query}%,ticket_number.ilike.%${query}%`)
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