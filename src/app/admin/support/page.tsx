'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Bug,
  Sparkles,
  User,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type {
  SupportTicket,
  TicketStatus,
  TicketCategory,
} from '@/types/support';

interface AdminTicket extends SupportTicket {
  user_email?: string;
  has_user_reply?: boolean;
  last_reply_from_user?: boolean;
  waiting_for_admin?: boolean;
}

export default function AdminSupportPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all' | 'active'>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/admin');
      return;
    }
    fetchAllTickets();
  }, [isAdmin, router]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      const supabase = (
        await import('@/lib/supabase/client')
      ).createClientSupabaseClient();
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all unique user IDs to get their emails
      const ticketData = tickets || [];
      const userIds = [...new Set(ticketData.map((t: { user_id: string }) => t.user_id).filter(Boolean))];
      const userEmailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);
        profiles?.forEach((p: { id: string; email: string; first_name?: string; last_name?: string }) => {
          if (p.email) {
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            userEmailMap[p.id] = name ? `${name} (${p.email})` : p.email;
          }
        });
      }

      // Get message information for each ticket
      const ticketsWithInfo = await Promise.all(
        ticketData.map(async (ticket: SupportTicket) => {
          // Get all messages for this ticket
          const { data: messages } = await supabase
            .from('support_messages')
            .select('id, is_admin, created_at')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false });

          const messageCount = messages?.length || 0;
          const lastMessage = messages?.[0];
          const hasUserReply = messages?.some((msg: { is_admin: boolean }) => !msg.is_admin) || false;
          const lastReplyIsFromUser = lastMessage && !lastMessage.is_admin;

          // Check if waiting for admin response (last message is from user and ticket is open)
          const waitingForAdmin =
            lastReplyIsFromUser &&
            (ticket.status === 'open' || ticket.status === 'in_progress');

          return {
            ...ticket,
            user_email: userEmailMap[ticket.user_id] || ticket.user_id,
            message_count: messageCount,
            has_user_reply: hasUserReply,
            last_reply_from_user: lastReplyIsFromUser,
            waiting_for_admin: waitingForAdmin,
            last_message_at: lastMessage?.created_at,
          };
        })
      );

      setTickets(ticketsWithInfo);
      setFilteredTickets(ticketsWithInfo);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
      setFilteredTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        ticket =>
          ticket.subject.toLowerCase().includes(q) ||
          ticket.ticket_number.toLowerCase().includes(q) ||
          (ticket.user_email && ticket.user_email.toLowerCase().includes(q))
      );
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(
        ticket => ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_on_user'
      );
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  };

  const getCategoryIcon = (category: TicketCategory) => {
    switch (category) {
      case 'bug':
        return <Bug className="w-4 h-4" />;
      case 'feature_request':
        return <Sparkles className="w-4 h-4" />;
      case 'billing':
        return <CreditCard className="w-4 h-4" />;
      case 'technical':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Stats calculation
  const stats = {
    total: tickets.length,
    waitingForAdmin: tickets.filter(t => t.waiting_for_admin).length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(
      t => t.status === 'resolved' || t.status === 'closed'
    ).length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Support Tickets
          </h1>
          <p className="text-gray-600">
            Manage and respond to customer support requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <Card className="p-3">
            <div className="text-xl font-bold text-gray-900">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </Card>
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="text-xl font-bold text-yellow-700">
              {stats.waitingForAdmin}
            </div>
            <div className="text-xs text-gray-600">Awaiting Reply</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-red-600">
              {stats.open}
            </div>
            <div className="text-xs text-gray-600">Open</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-yellow-600">
              {stats.inProgress}
            </div>
            <div className="text-xs text-gray-600">In Progress</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-green-600">
              {stats.resolved}
            </div>
            <div className="text-xs text-gray-600">Resolved</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-red-600">
              {stats.urgent}
            </div>
            <div className="text-xs text-gray-600">Urgent</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by subject, ticket #, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value as TicketStatus | 'all' | 'active')
              }
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_user">Waiting on User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <Button onClick={fetchAllTickets} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tickets Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No tickets found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'active' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No active support tickets'}
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-gray-200">
            {filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  ticket.waiting_for_admin
                    ? 'bg-yellow-50 border-l-4 border-l-yellow-500'
                    : ''
                }`}
                onClick={() => router.push(`/admin/support/${ticket.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Subject + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </span>
                      <Badge variant={getStatusColor(ticket.status)}>
                        <span className="flex items-center gap-1 text-xs">
                          {getStatusIcon(ticket.status)}
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </Badge>
                      <Badge variant={getPriorityColor(ticket.priority)}>
                        <span className="text-xs">{ticket.priority}</span>
                      </Badge>
                      {ticket.waiting_for_admin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Awaiting Reply
                        </span>
                      )}
                    </div>

                    {/* Row 2: Metadata */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="font-mono">{ticket.ticket_number}</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">
                          {ticket.user_email || ticket.user_id?.substring(0, 8) + '...'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        {getCategoryIcon(ticket.category)}
                        {ticket.category.replace(/_/g, ' ')}
                      </span>
                      {(ticket.message_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {ticket.message_count}
                          {ticket.last_reply_from_user && (
                            <span className="text-orange-600 font-medium ml-1">
                              User replied
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Time + Arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                    <span title={formatDate(ticket.last_message_at || ticket.created_at)}>
                      {formatRelativeDate(ticket.last_message_at || ticket.created_at)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
