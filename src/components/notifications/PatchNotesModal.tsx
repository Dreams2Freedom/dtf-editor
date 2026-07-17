'use client';

/**
 * "What's new" patch-notes modal. Shows the most-recent release notes ONCE to a
 * logged-in user who hasn't seen this version. "Seen" is tracked per-browser in
 * localStorage (keyed by version), so it never re-shows for a version and a
 * user who missed older releases only ever sees the latest.
 *
 * Mounted globally (inside AuthProvider) so it can appear on any authenticated
 * page after login.
 */

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { APP_VERSION, PATCH_NOTES } from '@/config/patchNotes';

const STORAGE_KEY = 'dtf_patchnotes_seen_version';

export function PatchNotesModal() {
  const user = useAuthStore(state => state.user);
  const [open, setOpen] = useState(false);
  const latest = PATCH_NOTES[0];

  useEffect(() => {
    if (!user || !latest) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* localStorage unavailable — skip */
    }
    if (seen === latest.version) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Only surface the modal once an admin has PUBLISHED this version from the
    // admin panel. Until then the notes exist in the build but stay hidden.
    (async () => {
      try {
        const res = await fetch('/api/patch-notes', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as { publishedVersion?: string | null };
        if (cancelled) return;
        if (data.publishedVersion !== latest.version) return;
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
  }, [user, latest]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, latest?.version ?? APP_VERSION);
    } catch {
      /* ignore */
    }
  };

  if (!latest) return null;

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
        <p className="text-xs text-gray-400 mb-4">{latest.date}</p>
      </div>

      <ul className="space-y-2.5 text-left">
        {latest.items.map((item, i) => (
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
