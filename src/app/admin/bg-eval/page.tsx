'use client';

/**
 * Background-Removal Eval (Phase 1 safety net — admin only).
 *
 * Runs real images through BOTH engines side by side so we can judge accuracy
 * before changing any default behaviour:
 *   - "Current" = the client-side classical whole-shape colour-key engine
 *     (detectBorderColor + computeWholeShapeMask), i.e. exactly what the tool
 *     does today by default.
 *   - "AI: BRIA" / "AI: BiRefNet" = the in-house rembg ML service (real subject
 *     segmentation), via the existing removeBackground() call path.
 *
 * This page is additive: it imports the existing engine functions and never
 * modifies the tool. It exists to build the before/after comparison set from
 * already-uploaded customer images.
 */

import { useCallback, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { RefreshCw, Upload, Play, Loader2 } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
// This admin-only eval harness deliberately runs the real bg-removal engines
// for side-by-side comparison, so it must reach into the tool folder directly.
// eslint-disable-next-line no-restricted-imports
import {
  detectBorderColor,
  computeWholeShapeMask,
} from '@/tools/bg-removal/scribbleBrush';
// eslint-disable-next-line no-restricted-imports
import { removeBackground, segmentEverything } from '@/tools/bg-removal/api';

type CellStatus = 'idle' | 'running' | 'done' | 'error';

interface Cell {
  url?: string;
  status: CellStatus;
  ms?: number;
  error?: string;
}

interface EvalRow {
  id: string;
  name: string;
  srcUrl: string;
  blob?: Blob;
  classical: Cell;
  aiBria: Cell;
  aiBirefnet: Cell;
  samOverlay: Cell; // SAM pieces tinted over the original
  samCutout: Cell; // subject-only cutout from SAM pieces + our heuristic
}

const MAX_DIM = 1400; // matches the tool's REACH_REFERENCE_DIM normalization

/** Load a blob into an <img> without tainting the canvas (object URL is same-origin). */
function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Could not decode image'));
    };
    img.src = objUrl;
  });
}

/**
 * Run the CURRENT (classical whole-shape) engine, faithful to the tool's
 * default "Keep whole shape" path: median border colour → colour-distance key
 * → flood from edges → keep = enclosed, with the same resolution-scaled
 * gap-seal + defringe defaults the tool uses.
 */
async function runClassical(blob: Blob): Promise<string> {
  const img = await blobToImage(blob);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const bg = detectBorderColor(data, w, h);
  // Defaults mirrored from Panel.tsx: BG_CONNECT_TOLERANCE=70; sealRadius is
  // resolution-scaled; defringe slider default 55 → px = (amt/100)*sealRadius*2.
  const colorTolerance = 70;
  const sealRadius = Math.max(3, Math.round((Math.max(w, h) / 1400) * 5));
  const defringePx = Math.round((55 / 100) * sealRadius * 2);

  const keep = computeWholeShapeMask(
    data,
    w,
    h,
    bg,
    colorTolerance,
    sealRadius,
    defringePx
  );
  for (let i = 0; i < keep.length; i++) {
    if (keep[i] === 0) data[i * 4 + 3] = 0; // remove → transparent
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export default function BgEvalPage() {
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  const patch = useCallback(
    (id: string, updates: Partial<EvalRow>) => {
      setRows(prev =>
        prev.map(r => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  /** Pull the admin's recent uploads from the images table (in-browser, as the user). */
  const loadRecentUploads = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClientSupabaseClient();
      const { data, error } = await supabase
        .from('images')
        .select('id, original_filename, storage_url, created_at')
        .not('storage_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;

      type ImgRow = {
        id?: string;
        original_filename?: string;
        storage_url?: string;
        created_at?: string;
      };
      const next: EvalRow[] = ((data as ImgRow[]) || []).map((img, i) => {
        let url = img.storage_url as string;
        if (url && !url.startsWith('http')) {
          const { data: pub } = supabase.storage
            .from('images')
            .getPublicUrl(url);
          url = pub?.publicUrl || url;
        }
        return {
          id: (img.id as string) || `row-${i}`,
          name: (img.original_filename as string) || `image-${i + 1}`,
          srcUrl: url,
          classical: { status: 'idle' },
          aiBria: { status: 'idle' },
          aiBirefnet: { status: 'idle' },
          samOverlay: { status: 'idle' },
          samCutout: { status: 'idle' },
        };
      });
      setRows(next);
      if (!next.length) toast.info('No uploaded images found.');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Could not load uploads'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /** Manual fallback: add images from disk. */
  const onFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const next: EvalRow[] = Array.from(files).map((f, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: f.name,
      srcUrl: URL.createObjectURL(f),
      blob: f,
      classical: { status: 'idle' },
      aiBria: { status: 'idle' },
      aiBirefnet: { status: 'idle' },
      samOverlay: { status: 'idle' },
      samCutout: { status: 'idle' },
    }));
    setRows(prev => [...next, ...prev]);
  }, []);

  const ensureBlob = useCallback(
    async (row: EvalRow): Promise<Blob> => {
      if (row.blob) return row.blob;
      const res = await fetch(row.srcUrl);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const blob = await res.blob();
      patch(row.id, { blob });
      return blob;
    },
    [patch]
  );

  const runRow = useCallback(
    async (row: EvalRow) => {
      let blob: Blob;
      try {
        blob = await ensureBlob(row);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'load failed';
        patch(row.id, {
          classical: { status: 'error', error: msg },
          aiBria: { status: 'error', error: msg },
          aiBirefnet: { status: 'error', error: msg },
          samOverlay: { status: 'error', error: msg },
          samCutout: { status: 'error', error: msg },
        });
        return;
      }

      // Classical (current engine) — runs locally, fast.
      patch(row.id, { classical: { status: 'running' } });
      try {
        const t0 = performance.now();
        const url = await runClassical(blob);
        patch(row.id, {
          classical: { status: 'done', url, ms: performance.now() - t0 },
        });
      } catch (e) {
        patch(row.id, {
          classical: {
            status: 'error',
            error: e instanceof Error ? e.message : 'failed',
          },
        });
      }

      // AI engines — server round-trip; may cold-start on the first call.
      const runAi = async (
        key: 'aiBria' | 'aiBirefnet',
        model: 'bria-rmbg' | 'birefnet-general'
      ) => {
        patch(row.id, { [key]: { status: 'running' } } as Partial<EvalRow>);
        try {
          const t0 = performance.now();
          const result = await removeBackground(blob, {
            mode: 'ml-only',
            model,
          });
          patch(row.id, {
            [key]: {
              status: 'done',
              url: result.url,
              ms: performance.now() - t0,
            },
          } as Partial<EvalRow>);
        } catch (e) {
          patch(row.id, {
            [key]: {
              status: 'error',
              error: e instanceof Error ? e.message : 'failed',
            },
          } as Partial<EvalRow>);
        }
      };

      // Sequential so the first call warms the container before the second.
      await runAi('aiBria', 'bria-rmbg');
      await runAi('aiBirefnet', 'birefnet-general');

      // SAM "find everything" — one call returns both the piece overlay and the
      // subject cutout. Heaviest step (grid sweep on CPU), so it runs last.
      patch(row.id, {
        samOverlay: { status: 'running' },
        samCutout: { status: 'running' },
      });
      try {
        const t0 = performance.now();
        const seg = await segmentEverything(blob);
        const ms = performance.now() - t0;
        patch(row.id, {
          samOverlay: {
            status: 'done',
            url: seg.overlayUrl,
            ms,
          },
          samCutout: { status: 'done', url: seg.cutoutUrl, ms },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'failed';
        patch(row.id, {
          samOverlay: { status: 'error', error: msg },
          samCutout: { status: 'error', error: msg },
        });
      }
    },
    [ensureBlob, patch]
  );

  const runAll = useCallback(async () => {
    setRunningAll(true);
    try {
      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop
        await runRow(row);
      }
    } finally {
      setRunningAll(false);
    }
  }, [rows, runRow]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Background Removal — Engine Comparison
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Phase 1 safety net. Runs real images through the current classical
            engine vs. the AI engine (BRIA &amp; BiRefNet), side by side.
            Results show on a checkerboard so transparency is visible. The first
            AI call may take 10–30s while the service wakes up.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Button onClick={loadRecentUploads} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Load my recent uploads
            </Button>

            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Upload className="mr-2 h-4 w-4" />
              Add from disk
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => onFiles(e.target.files)}
              />
            </label>

            <div className="flex-1" />

            <Button
              onClick={runAll}
              disabled={runningAll || rows.length === 0}
            >
              {runningAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run all ({rows.length})
            </Button>
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            Load your recent uploads or add images from disk to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map(row => (
              <Card key={row.id}>
                <CardContent className="py-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-gray-800">
                      {row.name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runRow(row)}
                    >
                      Run
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <EvalCell label="Original" cell={{ status: 'done', url: row.srcUrl }} plain />
                    <EvalCell label="Current (classical)" cell={row.classical} />
                    <EvalCell label="AI: BRIA" cell={row.aiBria} />
                    <EvalCell label="AI: BiRefNet" cell={row.aiBirefnet} />
                    <EvalCell label="SAM: pieces" cell={row.samOverlay} plain />
                    <EvalCell label="SAM: subject" cell={row.samCutout} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const CHECKER =
  'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

function EvalCell({
  label,
  cell,
  plain = false,
}: {
  label: string;
  cell: Cell;
  plain?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {cell.ms != null && (
          <span className="text-[10px] text-gray-400">
            {(cell.ms / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200"
        style={plain ? undefined : { background: CHECKER }}
      >
        {cell.status === 'running' && (
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        )}
        {cell.status === 'error' && (
          <span className="px-2 text-center text-[10px] text-red-500">
            {cell.error || 'error'}
          </span>
        )}
        {cell.url && cell.status !== 'running' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cell.url}
            alt={label}
            className="max-h-full max-w-full object-contain"
          />
        )}
        {cell.status === 'idle' && (
          <span className="text-[10px] text-gray-300">not run</span>
        )}
      </div>
    </div>
  );
}
