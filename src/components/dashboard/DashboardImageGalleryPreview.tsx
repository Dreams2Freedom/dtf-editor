'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Image as ImageIcon, Ruler, ArrowRight } from 'lucide-react';

/**
 * DashboardImageGalleryPreview — a prominent, at-a-glance preview of the
 * user's most recent artwork on the dashboard home, with a clear link to the
 * full gallery. Reuses the SAME data source as the full gallery (the
 * `get_user_images` Supabase RPC) so there is no second source of truth.
 * Read-only preview — no processing/auth/payment logic here.
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
          <p className="mt-1 text-sm text-gray-500">
            View your uploaded artwork, processed files, and recent downloads in
            one place.
          </p>
        </div>
        <a
          href="#my-images"
          className="hidden shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 sm:inline-flex"
        >
          View Full Gallery <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
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
            Upload artwork or use a tool to start building your gallery.
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
                <a
                  key={img.id}
                  href={url || '#my-images'}
                  target={url ? '_blank' : undefined}
                  rel={url ? 'noopener noreferrer' : undefined}
                  aria-label={`View ${name}`}
                  className="group block overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="relative aspect-square" style={CHECKER}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
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
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-gray-900">
                      {name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(img.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Mobile: keep the full-gallery link clearly visible */}
          <a
            href="#my-images"
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:hidden"
          >
            View Full Gallery <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </>
      )}
    </section>
  );
}
