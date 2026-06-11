'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  Image as ImageIcon,
  ArrowRight,
  Download,
  Wand2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

/**
 * DashboardImageGalleryPreview — compact preview of the user's 6 most recent
 * images on the dashboard home, with quick Download / Use-a-Tool actions.
 *
 * Performance / reliability / cost notes:
 * - Fetches ONLY the 6 most recent records via the `get_user_images` RPC
 *   (`p_limit: 6`), which already sorts by created_at DESC server-side. The
 *   full library still lives at /dashboard/my-images.
 * - The `images` bucket is PUBLIC, so URLs come from `getPublicUrl` (a local
 *   string op — no signed-URL generation, no per-render storage cost). URLs
 *   are resolved once at fetch time and held in state.
 * - Thumbnails render through next/image, which resizes the full-size original
 *   into a small cached WebP/AVIF on the server (7-day cache). The browser only
 *   downloads a small optimized thumbnail, not the full-size artwork. Download
 *   / Use-a-Tool still point at the full-resolution original.
 * - The query is gated on a ready user id and retries transient failures
 *   (e.g. the Supabase client session not yet hydrated right after login), so
 *   recent images appear without a manual refresh / re-login. Errors surface a
 *   Retry state instead of silently rendering "no images".
 */

interface RecentImage {
  id: string;
  original_filename?: string;
  processed_filename?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  storage_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

type LoadState = 'loading' | 'success' | 'error';

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Ready', cls: 'bg-green-50 text-green-700' },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700' },
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
};

const PREVIEW_COUNT = 6;
const MAX_RETRIES = 3;

// Thumbnails are rendered at ~16vw (desktop, 6-up) down to 50vw (mobile, 2-up).
const THUMB_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw';

// Lightweight in-memory cache keyed by user id so returning to the dashboard
// within a session renders instantly while we revalidate in the background.
// Cleared on full reload (which is also when a fresh session is established).
const recentCache = new Map<string, RecentImage[]>();

// Transparency checker background for thumbnails (matches the gallery look).
const CHECKER: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

// Resolve the public URL for an image the same way the full gallery does.
// The bucket is public, so getPublicUrl is a local string build (no network).
function resolveUrls(
  list: RecentImage[],
  supabase: ReturnType<typeof createClientSupabaseClient>
): RecentImage[] {
  return list.map(img => {
    const next = { ...img };
    if (next.storage_url && !next.storage_url.startsWith('http')) {
      const { data: pub } = supabase.storage
        .from('images')
        .getPublicUrl(next.storage_url);
      if (pub?.publicUrl) {
        next.storage_url = pub.publicUrl;
        next.thumbnail_url = pub.publicUrl;
      }
    } else if (
      next.storage_url &&
      (!next.thumbnail_url || !next.thumbnail_url.startsWith('http'))
    ) {
      next.thumbnail_url = next.storage_url;
    }
    return next;
  });
}

// Download via the existing public URL (client-only, no backend); fall back to
// opening the file if the blob fetch is blocked.
async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'dtf-editor-image';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export function DashboardImageGalleryPreview() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const [images, setImages] = useState<RecentImage[]>(() =>
    userId ? (recentCache.get(userId) ?? []) : []
  );
  // If we have cached data for this user, render it immediately.
  const [state, setState] = useState<LoadState>(() =>
    userId && recentCache.has(userId) ? 'success' : 'loading'
  );
  const [broken, setBroken] = useState<Set<string>>(new Set());

  // Track the active request so stale responses / retries can't update state
  // after unmount or after the user id changes.
  const requestRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    (id: string, attempt = 0, isBackground = false) => {
      const requestId = ++requestRef.current;
      if (!isBackground && attempt === 0 && !recentCache.has(id)) {
        setState('loading');
      }

      (async () => {
        try {
          const supabase = createClientSupabaseClient();
          // Fetch only the 6 most recent records (RPC sorts created_at DESC).
          const { data, error } = await supabase.rpc('get_user_images', {
            p_user_id: id,
            p_limit: PREVIEW_COUNT,
            p_offset: 0,
          });

          // Ignore if a newer request started or the user changed.
          if (requestId !== requestRef.current) return;

          if (error) {
            // Transient failures (e.g. session not yet hydrated right after
            // login) — retry with backoff before surfacing an error.
            if (attempt < MAX_RETRIES) {
              retryTimer.current = setTimeout(
                () => load(id, attempt + 1, isBackground),
                400 * 2 ** attempt
              );
              return;
            }
            // Keep any cached images visible rather than blanking the section.
            if (!recentCache.has(id)) setState('error');
            return;
          }

          const resolved = resolveUrls(
            ((data as RecentImage[]) || []).slice(0, PREVIEW_COUNT),
            supabase
          );

          recentCache.set(id, resolved);
          setImages(resolved);
          setBroken(new Set());
          setState('success');
        } catch {
          if (requestId !== requestRef.current) return;
          if (attempt < MAX_RETRIES) {
            retryTimer.current = setTimeout(
              () => load(id, attempt + 1, isBackground),
              400 * 2 ** attempt
            );
            return;
          }
          if (!recentCache.has(id)) setState('error');
        }
      })();
    },
    []
  );

  useEffect(() => {
    if (!userId) return;
    // If cached, revalidate quietly in the background; otherwise show skeletons.
    load(userId, 0, recentCache.has(userId));

    const timerRef = retryTimer;
    return () => {
      // Invalidate in-flight requests and pending retries on unmount / id change.
      // requestRef is a request-sequence counter (not a DOM node); bumping it
      // here is the intended "cancel in-flight" behaviour.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestRef.current++;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, load]);

  const handleRetry = useCallback(() => {
    if (!userId) return;
    setState('loading');
    load(userId, 0, false);
  }, [userId, load]);

  return (
    <section
      aria-labelledby="dashboard-gallery-heading"
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="dashboard-gallery-heading"
            className="text-lg sm:text-xl font-bold text-gray-900"
          >
            Your Image Gallery
          </h2>
          <p className="mt-1 text-sm text-gray-500">Your 6 most recent images.</p>
        </div>
        <Link
          href="/dashboard/my-images"
          className="hidden shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 sm:inline-flex"
        >
          View All Images <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {state === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ) : state === 'error' ? (
        <div className="rounded-lg border border-dashed border-red-200 bg-red-50/50 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-gray-900">
            We couldn&apos;t load your recent images
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Try again, or open My Images to view your full library.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
            <Link
              href="/dashboard/my-images"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Open My Images <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <ImageIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-gray-900">No images yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload artwork or use a tool to start building your image gallery.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/process"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Choose a Tool <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {images.map(img => {
              const url = img.thumbnail_url || img.storage_url;
              const name =
                img.processed_filename || img.original_filename || 'Untitled';
              const status =
                STATUS[img.processing_status || 'pending'] || STATUS.pending;
              const showImg = url && !broken.has(img.id);
              return (
                <div
                  key={img.id}
                  className="group overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="relative aspect-square" style={CHECKER}>
                    {showImg ? (
                      <Image
                        src={url as string}
                        alt={name}
                        fill
                        sizes={THUMB_SIZES}
                        loading="lazy"
                        className="object-cover"
                        onError={() =>
                          setBroken(prev => new Set(prev).add(img.id))
                        }
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon
                          className="h-6 w-6 text-gray-300"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <span
                      className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}
                    >
                      {status.label}
                    </span>

                    {/* Quick actions: always visible on touch, hover-revealed on desktop */}
                    {url && (
                      <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => downloadImage(url, name)}
                          aria-label={`Download ${name}`}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white/95 px-2 py-1.5 text-[11px] font-semibold text-gray-900 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Download
                        </button>
                        <Link
                          href={`/process?image=${encodeURIComponent(url)}`}
                          aria-label={`Use a tool on ${name}`}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-amber-500 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        >
                          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Use a Tool
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-gray-900">
                      {name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(img.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: keep the full-library link clearly visible */}
          <Link
            href="/dashboard/my-images"
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:hidden"
          >
            View All Images <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </>
      )}
    </section>
  );
}
