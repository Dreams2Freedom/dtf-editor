'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  User,
  Shield,
  Loader2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import type {
  SupportTicket,
  SupportMessage,
  TicketStatus,
} from '@/types/support';

export default function AdminTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.is_admin === true;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/admin');
      return;
    }
    if (user && isAdmin && params.id) {
      fetchTicketData();
    }
  }, [user, authLoading, isAdmin, router, params.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketData = async () => {
    if (!params.id || typeof params.id !== 'string') return;

    try {
      setLoading(true);
      const supabase = (
        await import('@/lib/supabase/client')
      ).createClientSupabaseClient();

      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', params.id)
        .single();

      if (ticketError) throw ticketError;

      setTicket(ticketData);

      // Fetch user email
      if (ticketData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', ticketData.user_id)
          .single();
        if (profileData) {
          const name = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
          setUserEmail(name ? `${name} (${profileData.email})` : profileData.email);
        }
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', params.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Enrich messages with author info
      const enriched = await Promise.all(
        (messagesData || []).map(async (msg: SupportMessage) => {
          if (msg.is_admin) {
            return { ...msg, author: { name: 'Support Team', email: '' } };
          }
          if (msg.user_id) {
            const { data: p } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', msg.user_id)
              .single();
            return {
              ...msg,
              author: p
                ? { name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email, email: p.email }
                : { name: 'User', email: '' },
            };
          }
          return { ...msg, author: { name: 'User', email: '' } };
        })
      );

      setMessages(enriched);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket');
      router.push('/admin/support');
    } finally {
      setLoading(false);
    }
  };

  const sendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticket || !newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/admin/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          message: newMessage.trim(),
          adminId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      const data = await response.json();

      // Add to messages list
      setMessages(prev => [
        ...prev,
        {
          ...data.message,
          author: { name: 'Support Team', email: '' },
        },
      ]);

      // Update ticket status to waiting_on_user
      setTicket(prev => prev ? { ...prev, status: 'waiting_on_user' as TicketStatus } : null);
      setNewMessage('');
      toast.success('Reply sent');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (newStatus: TicketStatus) => {
    if (!ticket) return;

    setUpdatingStatus(true);
    try {
      const supabase = (
        await import('@/lib/supabase/client')
      ).createClientSupabaseClient();

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;

      setTicket({ ...ticket, status: newStatus });
      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open':
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'waiting_on_user':
        return <MessageSquare className="w-4 h-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (
    status: TicketStatus
  ): 'default' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'open':
        return 'error';
      case 'in_progress':
        return 'warning';
      case 'waiting_on_user':
        return 'default';
      case 'resolved':
      case 'closed':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (
    priority: string
  ): 'default' | 'success' | 'warning' | 'error' => {
    switch (priority) {
      case 'low':
        return 'success';
      case 'medium':
        return 'default';
      case 'high':
        return 'warning';
      case 'urgent':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-4">Ticket not found</p>
          <Button onClick={() => router.push('/admin/support')}>
            Back to Support
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/support')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tickets
        </Button>

        {/* Ticket Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-mono text-gray-500">
                  {ticket.ticket_number}
                </span>
                <Badge variant={getStatusColor(ticket.status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(ticket.status)}
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </Badge>
                <Badge variant={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
                <Badge variant="default">
                  {ticket.category.replace(/_/g, ' ')}
                </Badge>
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {ticket.subject}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>From: <span className="font-medium text-gray-700">{userEmail || 'Unknown'}</span></span>
                <span>Created: {formatDate(ticket.created_at)}</span>
                <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex flex-wrap gap-2">
              {ticket.status === 'open' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus('in_progress')}
                    disabled={updatingStatus}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus('resolved')}
                    disabled={updatingStatus}
                  >
                    Resolve
                  </Button>
                </>
              )}
              {ticket.status === 'in_progress' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus('open')}
                    disabled={updatingStatus}
                  >
                    Back to Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus('resolved')}
                    disabled={updatingStatus}
                  >
                    Resolve
                  </Button>
                </>
              )}
              {ticket.status === 'waiting_on_user' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus('resolved')}
                  disabled={updatingStatus}
                >
                  Resolve
                </Button>
              )}
              {ticket.status === 'resolved' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus('open')}
                    disabled={updatingStatus}
                  >
                    Reopen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus('closed')}
                    disabled={updatingStatus}
                  >
                    Close
                  </Button>
                </>
              )}
              {ticket.status === 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus('open')}
                  disabled={updatingStatus}
                >
                  Reopen
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Messages */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages yet</p>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.is_admin ? 'bg-blue-50 -mx-4 px-4 py-3 rounded-lg' : 'py-2'}`}
                >
                  <div className="flex-shrink-0">
                    {message.is_admin ? (
                      <div className="w-10 h-10 bg-[#366494] rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.author?.name || (message.is_admin ? 'Support Team' : 'User')}
                      </span>
                      {message.is_admin && (
                        <Badge variant="default" className="text-xs">
                          Admin
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(message.created_at)}
                      </span>
                    </div>

                    <div className="text-gray-700 whitespace-pre-wrap break-words">
                      {message.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Admin Reply Form */}
        {ticket.status !== 'closed' ? (
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Reply as Admin</h3>
            <form onSubmit={sendAdminReply}>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type your reply to the customer..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#366494] focus:border-transparent resize-none mb-3"
                disabled={sending}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Sending will set ticket status to &quot;Waiting on User&quot; and notify them via email.
                </p>
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-[#366494] hover:bg-[#233E5C]"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Reply
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-6 bg-gray-50">
            <p className="text-center text-gray-600">
              This ticket is closed.
              <Button
                variant="ghost"
                onClick={() => updateStatus('open')}
                className="ml-1"
              >
                Reopen
              </Button>
              to reply.
            </p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
