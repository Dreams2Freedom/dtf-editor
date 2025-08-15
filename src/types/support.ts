export type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'technical' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  message_count?: number;
  last_message_at?: string;
  last_message_by?: 'user' | 'admin';
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id?: string;
  is_admin: boolean;
  message: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  created_at: string;
  edited_at?: string;
  author?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface SupportNotification {
  id: string;
  ticket_id: string;
  user_id: string;
  type: 'new_message' | 'status_change' | 'ticket_resolved';
  is_read: boolean;
  created_at: string;
  ticket?: SupportTicket;
}

export interface CreateTicketData {
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  message: string;
}

export interface CreateMessageData {
  ticket_id: string;
  message: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
}