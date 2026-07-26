'use client';

/**
 * "What's new" patch-notes modal. Shows the most-recent PUBLISHED patch note
 * ONCE to a logged-in user who hasn't seen it. "Seen" is tracked per-browser in
 * localStorage (keyed by the published version id), so it never re-shows for a
 * version, and a user who missed older releases only ever sees the latest one.
 *
 * The note is authored + published from the admin panel (see
 * /api/admin/patch-notes); this component just renders whatever is currently
 * published — it is NOT tied to the build's APP_VERSION.
 *
 * Mounted globally (inside AuthProvider) so it can appear on any authenticated
 * page after login.
 */

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';

const STORAGE_KEY = 'dtf_patchnotes_seen_version';

export function PatchNotesModal() {
  const user = useAuthStore(state => state.user);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [content, setContent] = useState<{ date: string; items: string[] }>({
    date: '',
    items: [],
  });

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const res = await fetch('/api/patch-notes', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          publishedVersion?: string | null;
          date?: string | null;
          items?: string[] | null;
        };
        if (cancelled) return;

        const v = data.publishedVersion || null;
        const items = Array.isArray(data.items) ? data.items : [];
        // Nothing published, or an empty note → don't show anything.
        if (!v || items.length === 0) return;

        // Already saw THIS published version → don't re-show.
        let seen: string | null = null;
        try {
          seen = localStorage.getItem(STORAGE_KEY);
        } catch {
          /* localStorage unavailable — treat as unseen */
        }
        if (seen === v) return;

        setVersion(v);
        setContent({ date: data.date || '', items });
        // Small delay so it doesn't fight the initial page paint / redirects.
        timer = setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 700);
      } catch {
        /* network error — stay hidden */
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const dismiss = () => {
    setOpen(false);
    try {
      if (version) localStorage.setItem(STORAGE_KEY, version);
    } catch {
      /* ignore */
    }
  };

  if (!version) return null;

  return (
    <Modal
      open={open}
      onOpenChange={o => {
        if (!o) dismiss();
      }}
      size="sm"
      showCloseButton={false}
      ariaLabel="What's new"
    >
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">What&apos;s new</h2>
        <p className="text-xs text-gray-400 mb-4">{content.date}</p>
      </div>

      <ul className="space-y-2.5 text-left">
        {content.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed"
          >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={dismiss}
        className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
      >
        Got it
      </button>
    </Modal>
  );
}
