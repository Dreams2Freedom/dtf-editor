'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  Image as ImageIcon,
  Ruler,
  ArrowRight,
  Download,
  Wand2,
} from 'lucide-react';

/**
 * DashboardImageGalleryPreview — compact preview of the user's 6 most recent
 * uploads on the dashboard home, with quick Download / Use-a-Tool actions.
 * Reuses the SAME data source as the full gallery (the `get_user_images`
 * Supabase RPC) — no second source of truth. The full library lives at
 * /dashboard/my-images.
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

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Ready', cls: 'bg-green-50 text-green-700' },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700' },
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
};

const PREVIEW_COUNT = 6;

// Transparency checker background for thumbnails (matches the gallery look).
const CHECKER: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

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
  const [images, setImages] = useState<RecentImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    (async () => {
      try {
        const supabase = createClientSupabaseClient();
        const { data, error } = await supabase.rpc('get_user_images', {
          p_user_id: user.id,
        });
        if (!active) return;
        if (error) {
          setImages([]);
          setLoading(false);
          return;
        }

        const list: RecentImage[] = (data || []) as RecentImage[];
        // Resolve public URLs the same way the full gallery does.
        for (const img of list) {
          if (img.storage_url && !img.storage_url.startsWith('http')) {
            const { data: pub } = supabase.storage
              .from('images')
              .getPublicUrl(img.storage_url);
            if (pub?.publicUrl) {
              img.storage_url = pub.publicUrl;
              img.thumbnail_url = pub.publicUrl;
            }
          } else if (
            img.storage_url &&
            (!img.thumbnail_url || !img.thumbnail_url.startsWith('http'))
          ) {
            img.thumbnail_url = img.storage_url;
          }
        }

        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setImages(list.slice(0, PREVIEW_COUNT));
        setLoading(false);
      } catch {
        if (active) {
          setImages([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

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
          <p className="mt-1 text-sm text-gray-500">Your 6 most recent uploads.</p>
        </div>
        <Link
          href="/dashboard/my-images"
          className="hidden shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 sm:inline-flex"
        >
          View All Images <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <ImageIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-gray-900">No images yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload artwork or use a tool to start building your image library.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/process"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Choose a Tool <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/tools/dpi-checker"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Ruler className="h-4 w-4" aria-hidden="true" /> Check DPI Free
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
              return (
                <div
                  key={img.id}
                  className="group overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="relative aspect-square" style={CHECKER}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
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
