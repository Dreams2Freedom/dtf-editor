'use client';

/**
 * Hamilton — the help & announcements widget that replaces the old notification
 * bell. Shows a count badge for unread app-wide announcements (posted from the
 * admin panel). Clicking opens a small panel with any announcements, a curated
 * FAQ, and a Contact Support button.
 *
 * The character art loads from /hamilton.png; if it's missing we fall back to a
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { HAMILTON_FAQS } from './hamiltonFaqs';

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
  const [tab, setTab] = useState<'menu' | 'faq'>('menu');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Help and announcements"
        title="Hamilton — help & announcements"
      >
        {avatar('w-8 h-8')}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            {avatar('w-10 h-10')}
            <div>
              <p className="font-semibold leading-tight">
                Hamilton here — how can I help?
              </p>
              <p className="text-xs text-white/80">
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
                    onClick={() => setTab('faq')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-400" /> FAQs
                    </span>
                    <ChevronDown className="w-4 h-4 -rotate-90 text-gray-400" />
                  </button>
                  <Link
                    href="/support"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium justify-center"
                  >
                    <LifeBuoy className="w-4 h-4" /> Contact Support
                  </Link>
                </div>
              </>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
