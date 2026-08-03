'use client';

/**
 * BG Studio (admin) — a customer-experience SIMULATION of the SAM-powered
 * background remover. It deliberately shows ONLY what a customer would see:
 * pick a photo, hit "Remove Background", watch a simple progress state, get the
 * clean cutout on a transparent checkerboard, then refine with Restore/Erase
 * brushes and download. No SAM internals, no piece overlays, no timings/models.
 *
 * Admin-only and completely separate from the live Studio tool — it cannot
 * affect any customer-facing tool.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import {
  Upload,
  Eraser,
  Paintbrush,
  Download,
  Loader2,
  Wand2,
  X,
} from 'lucide-react';
// Admin sandbox deliberately uses the real bg-removal engine call.
// eslint-disable-next-line no-restricted-imports
import { samRemoveBackground } from '@/tools/bg-removal/api';

const MAX_DIM = 1024; // working canvas resolution (longest side)

type Status = 'idle' | 'removing' | 'ready' | 'error';
type Tool = 'restore' | 'erase';

interface Photo {
  id: string;
  file: File;
  url: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

export default function BgStudioPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [tool, setTool] = useState<Tool>('erase');
  const [brushSize, setBrushSize] = useState(30);
  const [hasResult, setHasResult] = useState(false);

  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const origRef = useRef<HTMLCanvasElement | null>(null); // original pixels
  const maskRef = useRef<HTMLCanvasElement | null>(null); // alpha mask
  const drawing = useRef(false);
  // Per-photo saved mask + result flag so switching photos keeps your work.
  const snapshots = useRef<Map<string, { maskUrl: string; result: boolean }>>(
    new Map()
  );
  const prevActive = useRef<string | null>(null);

  const activePhoto = photos.find(p => p.id === activeId) || null;

  const render = useCallback(() => {
    const disp = displayRef.current;
    const orig = origRef.current;
    const mask = maskRef.current;
    if (!disp || !orig || !mask) return;
    const ctx = disp.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, disp.width, disp.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(orig, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const loadPhoto = useCallback(
    async (photo: Photo) => {
      if (!origRef.current) origRef.current = document.createElement('canvas');
      if (!maskRef.current) maskRef.current = document.createElement('canvas');
      const img = await loadImage(photo.url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const s = Math.min(1, MAX_DIM / Math.max(w, h));
      w = Math.max(1, Math.round(w * s));
      h = Math.max(1, Math.round(h * s));

      const orig = origRef.current;
      const mask = maskRef.current;
      const disp = displayRef.current;
      if (!disp) return;
      for (const c of [orig, mask, disp]) {
        c.width = w;
        c.height = h;
      }
      orig.getContext('2d')!.drawImage(img, 0, 0, w, h);

      const mctx = mask.getContext('2d')!;
      mctx.clearRect(0, 0, w, h);
      const snap = snapshots.current.get(photo.id);
      if (snap) {
        const mimg = await loadImage(snap.maskUrl);
        mctx.drawImage(mimg, 0, 0, w, h);
        setHasResult(snap.result);
        setStatus(snap.result ? 'ready' : 'idle');
      } else {
        // Fully opaque mask = the whole photo is visible before removal.
        mctx.fillStyle = '#ffffff';
        mctx.fillRect(0, 0, w, h);
        setHasResult(false);
        setStatus('idle');
      }
      render();
    },
    [render]
  );

  const saveSnapshot = useCallback((id: string, result: boolean) => {
    const mask = maskRef.current;
    if (!mask) return;
    snapshots.current.set(id, {
      maskUrl: mask.toDataURL('image/png'),
      result,
    });
  }, []);

  // On active-photo change: snapshot the previous, load the new.
  useEffect(() => {
    if (prevActive.current && prevActive.current !== activeId) {
      saveSnapshot(prevActive.current, hasResult);
    }
    prevActive.current = activeId;
    if (activePhoto) loadPhoto(activePhoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const next: Photo[] = Array.from(files)
        .filter(f => f.type.startsWith('image/'))
        .map((f, i) => ({
          id: `p-${Date.now()}-${i}-${f.name}`,
          file: f,
          url: URL.createObjectURL(f),
        }));
      if (!next.length) return;
      setPhotos(prev => [...prev, ...next]);
      if (!activeId) setActiveId(next[0].id);
    },
    [activeId]
  );

  const removeBackground = useCallback(async () => {
    if (!activePhoto) return;
    setStatus('removing');
    try {
      const { cutoutUrl } = await samRemoveBackground(activePhoto.file);
      const cut = await loadImage(cutoutUrl);
      const mask = maskRef.current;
      if (!mask) return;
      const mctx = mask.getContext('2d')!;
      // The cutout's ALPHA is the mask: clear and draw it in (scaled to fit).
      mctx.clearRect(0, 0, mask.width, mask.height);
      mctx.globalCompositeOperation = 'source-over';
      mctx.drawImage(cut, 0, 0, mask.width, mask.height);
      setHasResult(true);
      setStatus('ready');
      render();
      if (activeId) saveSnapshot(activeId, true);
    } catch (e) {
      setStatus('error');
      toast.error(e instanceof Error ? e.message : 'Background removal failed');
    }
  }, [activePhoto, activeId, render, saveSnapshot]);

  // ---- brushing ----
  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const disp = displayRef.current;
      const mask = maskRef.current;
      if (!disp || !mask) return;
      const rect = disp.getBoundingClientRect();
      const x = (clientX - rect.left) * (disp.width / rect.width);
      const y = (clientY - rect.top) * (disp.height / rect.height);
      const mctx = mask.getContext('2d')!;
      mctx.save();
      if (tool === 'restore') {
        mctx.globalCompositeOperation = 'source-over';
        mctx.fillStyle = '#ffffff';
      } else {
        mctx.globalCompositeOperation = 'destination-out';
        mctx.fillStyle = '#000000';
      }
      mctx.beginPath();
      mctx.arc(x, y, Math.max(1, brushSize / 2), 0, Math.PI * 2);
      mctx.fill();
      mctx.restore();
      render();
    },
    [tool, brushSize, render]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (status === 'removing' || !activePhoto) return;
    drawing.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    paintAt(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    paintAt(e.clientX, e.clientY);
  };
  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (activeId) saveSnapshot(activeId, hasResult);
  };

  const download = useCallback(() => {
    const orig = origRef.current;
    const mask = maskRef.current;
    if (!orig || !mask) return;
    const out = document.createElement('canvas');
    out.width = orig.width;
    out.height = orig.height;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(orig, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    out.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cutout-${activePhoto?.file.name || 'image'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }, [activePhoto]);

  const removePhoto = (id: string) => {
    snapshots.current.delete(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (activeId === id) {
      const remaining = photos.filter(p => p.id !== id);
      setActiveId(remaining[0]?.id || null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            BG Studio — Customer Experience Preview
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Simulates how a customer will use the new background remover. Pick a
            photo, remove the background, then fine-tune with the brushes.
          </p>
        </div>

        {/* Uploader */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-sm font-semibold text-gray-600 hover:border-blue-400 hover:bg-blue-50">
          <Upload className="h-5 w-5" />
          Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
        </label>

        {/* Thumbnails */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map(p => (
              <div key={p.id} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    p.id === activeId ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute -right-1 -top-1 rounded-full bg-gray-800 p-0.5 text-white"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activePhoto ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            {/* Canvas */}
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-xl border border-gray-200 p-3"
              style={{
                background:
                  'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                minHeight: 360,
              }}
            >
              <canvas
                ref={displayRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                className="max-h-[70vh] max-w-full touch-none"
                style={{ cursor: 'crosshair' }}
              />
              {status === 'removing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Removing background…
                  </span>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="space-y-4">
              <Button
                onClick={removeBackground}
                disabled={status === 'removing'}
                fullWidth
              >
                {status === 'removing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {hasResult ? 'Remove Again' : 'Remove Background'}
              </Button>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Touch up
                </p>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTool('erase')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                      tool === 'erase'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <Eraser className="h-4 w-4" /> Erase
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('restore')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                      tool === 'restore'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <Paintbrush className="h-4 w-4" /> Restore
                  </button>
                </div>
                <label className="block text-xs text-gray-500">
                  Brush size: {brushSize}px
                  <input
                    type="range"
                    min={6}
                    max={90}
                    value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
                <p className="mt-2 text-[11px] text-gray-400">
                  Erase paints away areas; Restore brings them back.
                </p>
              </div>

              <Button
                onClick={download}
                variant="outline"
                fullWidth
                disabled={status === 'removing'}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            Add a photo to begin.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

// build nudge: re-trigger Vercel preview deploy
