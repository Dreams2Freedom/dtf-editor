'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import {
  RefreshCw,
  MessageCircle,
  Users,
  LifeBuoy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}
interface Conversation {
  id: string;
  email: string;
  messageCount: number;
  userQuestions: number;
  escalatedToTicket: boolean;
  createdAt: string;
  updatedAt: string;
  preview: string;
  messages: Msg[];
}
interface Stats {
  totalConversations: number;
  uniqueUsers: number;
  totalMessages: number;
  totalUserQuestions: number;
  escalatedToTicket: number;
  activeLast24h: number;
  activeLast7d: number;
}

const when = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');

export default function HamiltonAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/hamilton-conversations', {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setStats(data.stats ?? null);
      setConversations(data.conversations ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards: Array<{
    label: string;
    value: number;
    icon: React.ReactNode;
  }> = stats
    ? [
        {
          label: 'Conversations',
          value: stats.totalConversations,
          icon: <MessageCircle className="h-5 w-5 text-sky-600" />,
        },
        {
          label: 'Unique users',
          value: stats.uniqueUsers,
          icon: <Users className="h-5 w-5 text-indigo-600" />,
        },
        {
          label: 'Questions asked',
          value: stats.totalUserQuestions,
          icon: <MessageCircle className="h-5 w-5 text-emerald-600" />,
        },
        {
          label: 'Handed to support',
          value: stats.escalatedToTicket,
          icon: <LifeBuoy className="h-5 w-5 text-amber-600" />,
        },
        {
          label: 'Active (24h)',
          value: stats.activeLast24h,
          icon: <MessageCircle className="h-5 w-5 text-sky-500" />,
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-sky-600" />
              Hamilton Support Bot
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              What users are asking Hamilton, and where he hands off to support.
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map(c => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {c.icon}
                  <span className="text-xs text-gray-500">{c.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Conversation list */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No Hamilton conversations yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map(c => {
                  const isOpen = expanded === c.id;
                  return (
                    <div key={c.id}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : c.id)}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50"
                      >
                        <span className="mt-0.5 text-gray-400">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              {c.email}
                            </span>
                            <span className="text-xs text-gray-400">
                              {c.messageCount} msgs
                            </span>
                            {c.escalatedToTicket && (
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                Support ticket
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-0.5">
                            {c.preview || '—'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {when(c.updatedAt)}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-11 pb-4 space-y-2">
                          {c.messages.map((m, i) => (
                            <div
                              key={i}
                              className={
                                m.role === 'user' ? 'flex justify-end' : 'flex'
                              }
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                  m.role === 'user'
                                    ? 'bg-sky-600 text-white rounded-tr-sm'
                                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                }`}
                              >
                                {m.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
