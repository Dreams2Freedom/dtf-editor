'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { supportService } from '@/services/support';
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
  Shield
} from 'lucide-react';
import type { SupportTicket, SupportMessage, TicketStatus } from '@/types/support';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && params.id) {
      fetchTicketData();
    }
  }, [user, authLoading, router, params.id]);

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
      const data = await supportService.getTicket(params.id);
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      router.push('/support');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticket || !newMessage.trim()) return;

    setSending(true);
    try {
      const message = await supportService.addMessage({
        ticket_id: ticket.id,
        message: newMessage.trim()
      }, user.id);

      // Add to messages list with user info
      setMessages([...messages, {
        ...message,
        author: {
          name: 'You',
          email: user.email || ''
        }
      }]);
      
      setNewMessage('');
      
      // Update ticket status if it was closed
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        setTicket({ ...ticket, status: 'open' });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    
    try {
      await supportService.updateTicketStatus(ticket.id, newStatus);
      setTicket({ ...ticket, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update ticket status.');
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

  const getStatusColor = (status: TicketStatus): "default" | "success" | "warning" | "error" => {
    switch (status) {
      case 'open':
        return 'default';
      case 'in_progress':
        return 'warning';
      case 'waiting_on_user':
        return 'error';
      case 'resolved':
      case 'closed':
        return 'success';
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
      minute: '2-digit'
    });
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#366494] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#366494] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Ticket not found</p>
          <Button onClick={() => router.push('/support')} className="mt-4">
            Back to Support
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/support')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Support
          </Button>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-gray-500">
                    {ticket.ticket_number}
                  </span>
                  <Badge variant={getStatusColor(ticket.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(ticket.status)}
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </Badge>
                  <Badge variant="default">
                    {ticket.category.replace('_', ' ')}
                  </Badge>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {ticket.subject}
                </h1>
                
                <p className="text-sm text-gray-500">
                  Created {formatDate(ticket.created_at)}
                </p>
              </div>

              {/* Status Actions */}
              {ticket.status !== 'closed' && (
                <div className="flex gap-2">
                  {ticket.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus('resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {ticket.status === 'resolved' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus('open')}
                      >
                        Reopen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus('closed')}
                      >
                        Close Ticket
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Messages */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.is_admin ? 'bg-blue-50 -mx-4 px-4 py-3 rounded-lg' : ''}`}
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
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {message.author?.name || (message.is_admin ? 'Support Team' : 'You')}
                    </span>
                    {message.is_admin && (
                      <Badge variant="default" className="text-xs">
                        Support
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Reply Form */}
        {ticket.status !== 'closed' && (
          <Card className="p-6">
            <form onSubmit={sendMessage}>
              <div className="flex gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#366494] focus:border-transparent resize-none"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-[#366494] hover:bg-[#233E5C] self-end"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </form>
          </Card>
        )}

        {ticket.status === 'closed' && (
          <Card className="p-6 bg-gray-50">
            <p className="text-center text-gray-600">
              This ticket has been closed. 
              <Button
                variant="link"
                onClick={() => updateStatus('open')}
                className="ml-2"
              >
                Reopen ticket
              </Button>
              to continue the conversation.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}