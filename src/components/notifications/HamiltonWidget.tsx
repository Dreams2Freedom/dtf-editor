'use client';

/**
 * Hamilton — the help & announcements widget. Renders as a large floating
 * button pinned to the bottom-left of every authenticated page (it used to live
 * in the header next to the bell). Shows a count badge for unread app-wide
 * announcements (posted from the admin panel). Clicking opens a neutral panel
 * with any announcements, a curated FAQ, and a Contact Support button.
 *
 * The character art loads from /Hamilton.png; if it's missing we fall back to a
 * lucide icon so nothing breaks before the asset is added.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  ChevronDown,
  LifeBuoy,
  Megaphone,
  ExternalLink,
  HelpCircle,
  MessageCircle,
  Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { HAMILTON_FAQS } from './hamiltonFaqs';
import { CreateTicketModal } from '@/components/support/CreateTicketModal';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  // When Hamilton couldn't answer from the knowledge base we flag the turn so
  // the UI can surface a "start a support ticket" hand-off under it.
  offerTicket?: boolean;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string;
  action_text?: string;
  created_at: string;
  is_read?: boolean;
}

export function HamiltonWidget() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'menu' | 'faq' | 'ask'>('menu');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Ask Hamilton (support bot) chat state ---
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSeed, setTicketSeed] = useState<{
    subject: string;
    message: string;
  }>({ subject: '', message: '' });
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const authFetch = useCallback(async (init?: RequestInit) => {
    const supabase = createClientSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;
    return fetch('/api/notifications', {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await authFetch();
      if (!res || !res.ok) return;
      const data = await res.json();
      setAnnouncements(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* ignore transient errors */
    }
  }, [authFetch]);

  useEffect(() => {
    if (!user) return;
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchData]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    setTab('menu');
    // Opening clears the badge (mark all announcements read).
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setAnnouncements(a => a.map(n => ({ ...n, is_read: true })));
      authFetch({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      }).catch(() => {});
    }
  };

  const dismiss = (id: string) => {
    setAnnouncements(a => a.filter(n => n.id !== id));
    authFetch({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id, action: 'dismiss' }),
    }).catch(() => {});
  };

  // Keep the transcript pinned to the latest turn (and the typing bubble).
  useEffect(() => {
    if (tab !== 'ask') return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, chatBusy, tab]);

  const sendChat = useCallback(async () => {
    const question = chatInput.trim();
    if (!question || chatBusy) return;

    setChat(prev => [...prev, { role: 'user', content: question }]);
    setChatInput('');
    setChatBusy(true);

    try {
      const supabase = createClientSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('no session');

      const res = await fetch('/api/hamilton/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversationId, message: question }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      setChat(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.answer ||
            "I'm not totally sure about that one — let me get you to our support team.",
          offerTicket: data.canAnswer === false,
        },
      ]);
    } catch {
      setChat(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I couldn't reach my helper just now. You can start a support ticket and our team will jump in.",
          offerTicket: true,
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }, [chatInput, chatBusy, conversationId]);

  // Build a reviewable draft ticket from the current conversation and open the
  // support modal (the user can edit before sending).
  const startTicketFromChat = () => {
    const firstQuestion =
      chat.find(m => m.role === 'user')?.content?.trim() || '';
    const subject = firstQuestion
      ? firstQuestion.length > 60
        ? `${firstQuestion.slice(0, 57)}…`
        : firstQuestion
      : 'Question from Hamilton';
    const transcript = chat
      .map(m => `${m.role === 'user' ? 'You' : 'Hamilton'}: ${m.content}`)
      .join('\n');
    const message = transcript
      ? `Hi team, Hamilton couldn't fully answer this one. Here's our chat so far:\n\n${transcript}\n\n`
      : '';
    setTicketSeed({ subject, message });
    setOpen(false);
    setTicketOpen(true);
  };

  if (!user) return null;

  const avatar = (size: string) =>
    imgOk ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/Hamilton.png"
        alt="Hamilton"
        onError={() => setImgOk(false)}
        className={`${size} object-contain`}
      />
    ) : (
      <LifeBuoy className={`${size} text-blue-600`} />
    );

  const bubbleText =
    unreadCount > 0
      ? 'You have a notification!'
      : 'Hamilton here, how can I help?';

  return (
    <div
      className="fixed bottom-20 left-4 sm:bottom-24 sm:left-6 z-40 flex items-center gap-2.5"
      ref={rootRef}
    >
      <button
        onClick={toggleOpen}
        className="relative flex-shrink-0 flex items-center justify-center w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-white border-[3px] border-sky-300 shadow-lg hover:shadow-xl hover:border-sky-400 hover:-translate-y-0.5 transition-all"
        aria-label="Help and announcements"
        title="Hamilton — help & announcements"
      >
        {avatar('w-12 h-12 sm:w-14 sm:h-14')}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Comic-style speech bubble (only when the panel is closed) */}
      {!open && (
        <button
          type="button"
          onClick={toggleOpen}
          aria-label={
            unreadCount > 0 ? 'You have a notification' : 'Open Hamilton help'
          }
          className={`relative max-w-[168px] rounded-2xl border-2 px-3 py-2 text-left shadow-md hover:shadow-lg transition-shadow ${
            unreadCount > 0
              ? 'border-sky-400 bg-sky-50'
              : 'border-sky-300 bg-white'
          }`}
        >
          <span
            className={`block text-xs font-bold leading-snug ${
              unreadCount > 0 ? 'text-sky-700' : 'text-gray-800'
            }`}
          >
            {bubbleText}
          </span>
          {/* Tail pointing left toward Hamilton: coloured triangle + inner fill. */}
          <span
            className={`absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-b-[7px] border-r-[9px] border-t-transparent border-b-transparent ${
              unreadCount > 0 ? 'border-r-sky-400' : 'border-r-sky-300'
            }`}
          />
          <span
            className={`absolute -left-[5px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent ${
              unreadCount > 0 ? 'border-r-sky-50' : 'border-r-white'
            }`}
          />
        </button>
      )}

      {open && (
        <div className="absolute bottom-full left-0 mb-3 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-gray-100 border-b border-gray-200 text-gray-900">
            {avatar('w-10 h-10')}
            <div>
              <p className="font-semibold leading-tight">
                Hamilton here — how can I help?
              </p>
              <p className="text-xs text-gray-500">
                Announcements, FAQs &amp; support
              </p>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {tab === 'menu' ? (
              <>
                {announcements.length > 0 && (
                  <div className="p-3 border-b border-gray-100">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <Megaphone className="w-3.5 h-3.5" /> Announcements
                    </p>
                    <div className="space-y-2">
                      {announcements.map(n => (
                        <div
                          key={n.id}
                          className={`rounded-lg border p-2.5 ${
                            n.is_read
                              ? 'border-gray-100 bg-white'
                              : 'border-blue-100 bg-blue-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {n.title}
                            </p>
                            <button
                              onClick={() => dismiss(n.id)}
                              className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                              aria-label="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {n.message}
                          </p>
                          {n.action_url && n.action_text && (
                            <a
                              href={n.action_url}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1.5 hover:underline"
                            >
                              {n.action_text} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 space-y-1.5">
                  <button
                    onClick={() => setTab('ask')}
                    className="group w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sm font-medium text-sky-800 hover:bg-sky-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-sky-500" />
                      Have a question? Ask Hamilton
                    </span>
                    <ChevronDown className="w-4 h-4 -rotate-90 text-sky-400" />
                  </button>
                  <button
                    onClick={() => setTab('faq')}
                    className="group w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />{' '}
                      FAQs
                    </span>
                    <ChevronDown className="w-4 h-4 -rotate-90 text-gray-400 group-hover:text-blue-600" />
                  </button>
                  <Link
                    href="/support"
                    onClick={() => setOpen(false)}
                    className="group w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 text-sm font-medium justify-center transition-colors"
                  >
                    <LifeBuoy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />{' '}
                    Contact Support
                  </Link>
                </div>
              </>
            ) : tab === 'faq' ? (
              <div className="p-3">
                <button
                  onClick={() => setTab('menu')}
                  className="text-xs text-gray-500 hover:text-gray-800 mb-2"
                >
                  ← Back
                </button>
                <div className="space-y-1.5">
                  {HAMILTON_FAQS.map((f, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-gray-800"
                      >
                        {f.q}
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                            openFaq === i ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openFaq === i && (
                        <p className="px-3 pb-2.5 text-xs text-gray-600 leading-relaxed">
                          {f.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  href="/faq"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs text-blue-600 hover:underline mt-3"
                >
                  See all FAQs →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col h-[60vh] max-h-[420px]">
                <div className="px-3 pt-3">
                  <button
                    onClick={() => setTab('menu')}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    ← Back
                  </button>
                </div>

                {/* Transcript */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
                >
                  {chat.length === 0 && (
                    <div className="flex items-start gap-2">
                      {avatar('w-7 h-7')}
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-700">
                        Have a question? Ask me anything about DTF Editor and
                        I&apos;ll do my best to help!
                      </div>
                    </div>
                  )}

                  {chat.map((m, i) => (
                    <div key={i}>
                      {m.role === 'assistant' ? (
                        <div className="flex items-start gap-2">
                          {avatar('w-7 h-7')}
                          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-sky-600 px-3 py-2 text-sm text-white whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </div>
                      )}
                      {m.role === 'assistant' && m.offerTicket && (
                        <div className="mt-1.5 ml-9">
                          <button
                            onClick={startTicketFromChat}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#366494] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#233E5C] transition-colors"
                          >
                            <LifeBuoy className="w-3.5 h-3.5" />
                            Start a support ticket
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {chatBusy && (
                    <div className="flex items-start gap-2">
                      {avatar('w-7 h-7')}
                      <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-3">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t border-gray-200 p-2.5">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      sendChat();
                    }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                      rows={1}
                      placeholder="Have a question?"
                      className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent max-h-24"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || chatBusy}
                      className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CreateTicketModal
        isOpen={ticketOpen}
        onClose={() => setTicketOpen(false)}
        onSuccess={() => setTicketOpen(false)}
        initialSubject={ticketSeed.subject}
        initialMessage={ticketSeed.message}
      />
    </div>
  );
}
