'use client';

/**
 * Embeddable per-image Studio (Partner Tools API).
 *
 * Opened by the partner app (e.g. the Shopify gangsheet builder) in an
 * iframe/popup: `/embed/studio?token=<embed-session-token>`. It verifies the
 * token, loads the single image, and lets the user run the in-house tools on it
 * (each call authorized by the token, metered server-side). On "Done" it hands
 * the edited image URL back to the parent via postMessage.
 *
 * Parent integration:
 *   window.addEventListener('message', (e) => {
 *     if (e.data?.type === 'dtf-studio-result') { /* e.data.resultUrl *\/ }
 *     if (e.data?.type === 'dtf-studio-cancel') { /* closed *\/ }
 *   });
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Scissors,
  ArrowUpCircle,
  Pen,
  Ruler,
  Check,
  X,
  Loader2,
} from 'lucide-react';

type Status = 'loading' | 'ready' | 'invalid';

const CHECKER =
  'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px';

function EmbedStudio() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [status, setStatus] = useState<Status>('loading');
  const [workingUrl, setWorkingUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [totalCents, setTotalCents] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printW, setPrintW] = useState(11);
  const [printH, setPrintH] = useState(11);
  // #1 fix: the canonical URL of the last SUCCESSFUL tool result. `workingUrl`
  // doubles as the tool input + <img> src (and carries a cache-bust query), so
  // posting it on Done risked echoing the merchant's own input back when the
  // state update hadn't committed. This ref is set ONLY on a confirmed
  // resultUrl, so Done always returns the real edited file (or nothing changed).
  const lastResultUrlRef = useRef<string | null>(null);

  // #4: tell the parent the embed is alive as soon as the image is ready, so the
  // host can distinguish "still loading" from "loaded and editable" without
  // relying on the iframe load event (which fires even for a blocked frame).
  const readyPostedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/partner/v1/embed-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok || !data.imageUrl) {
          setStatus('invalid');
          return;
        }
        setWorkingUrl(data.imageUrl);
        setStatus('ready');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [token]);

  // #4: announce readiness to the host exactly once, when the embed is
  // interactive. Lets the parent distinguish "loading" from "loaded" without
  // relying on the iframe load event.
  useEffect(() => {
    if (status === 'ready' && !readyPostedRef.current) {
      readyPostedRef.current = true;
      window.parent?.postMessage({ type: 'dtf-studio-ready' }, '*');
    }
  }, [status]);

  const callTool = useCallback(
    async (
      path: string,
      extra: Record<string, unknown> = {}
    ): Promise<Record<string, unknown> | null> => {
      setError(null);
      setNote(null);
      setBusy(path);
      try {
        const res = await fetch(`/api/partner/v1/${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Embed-Token': token,
          },
          body: JSON.stringify({ imageUrl: workingUrl, ...extra }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        const cost = Number(data?.usage?.costCents) || 0;
        setTotalCents(c => c + cost);
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Tool failed');
        return null;
      } finally {
        setBusy(null);
      }
    },
    [token, workingUrl]
  );

  const runTransform = useCallback(
    async (path: string, extra: Record<string, unknown> = {}) => {
      const data = await callTool(path, extra);
      if (data?.resultUrl && typeof data.resultUrl === 'string') {
        // Record the canonical result (no cache-bust query) so Done posts the
        // real edited file, not the input. Then cache-bust the <img> src.
        lastResultUrlRef.current = data.resultUrl;
        setWorkingUrl(`${data.resultUrl}?v=${Date.now()}`);
      }
    },
    [callTool]
  );

  const runDpi = useCallback(async () => {
    const data = await callTool('dpi-check', {
      targetWidthInches: printW,
      targetHeightInches: printH,
    });
    if (data) {
      const dpi = data.dpi as { min?: number } | undefined;
      const meets = data.meetsStandard as boolean;
      setNote(
        `At ${printW}"×${printH}": ${dpi?.min ?? '?'} DPI — ${
          meets ? '✓ meets 300 DPI' : '✗ below 300 DPI (upscale recommended)'
        }`
      );
    }
  }, [callTool, printW, printH]);

  const done = () => {
    // Prefer the last real tool result; fall back to the (unedited) working
    // image only if no tool ran. Never post the cache-bust query.
    const resultUrl =
      lastResultUrlRef.current || workingUrl.split('?')[0] || workingUrl;
    window.parent?.postMessage(
      { type: 'dtf-studio-result', resultUrl, totalCents },
      '*'
    );
  };
  const cancel = () => {
    window.parent?.postMessage({ type: 'dtf-studio-cancel' }, '*');
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (status === 'invalid') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          This editing session is invalid or has expired. Please reopen it from
          your gangsheet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <span className="text-sm font-semibold text-gray-800">Edit image</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            type="button"
            onClick={done}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Check className="h-4 w-4" /> Done
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
        style={{ background: CHECKER }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={workingUrl}
          alt="Editing"
          className="max-h-full max-w-full object-contain"
        />
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Working…</span>
          </div>
        )}
      </div>

      {/* Messages */}
      {(note || error) && (
        <div
          className={`px-4 py-1.5 text-center text-xs ${
            error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
          }`}
        >
          {error || note}
        </div>
      )}

      {/* Toolbar */}
      <div className="border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToolButton
            label="Remove BG"
            icon={<Scissors className="h-4 w-4" />}
            busy={busy === 'background-removal'}
            disabled={!!busy}
            onClick={() => runTransform('background-removal')}
          />
          <ToolButton
            label="Upscale"
            icon={<ArrowUpCircle className="h-4 w-4" />}
            busy={busy === 'upscale'}
            disabled={!!busy}
            onClick={() => runTransform('upscale', { scale: 2 })}
          />
          <ToolButton
            label="Vectorize"
            icon={<Pen className="h-4 w-4" />}
            busy={busy === 'vectorize'}
            disabled={!!busy}
            onClick={() => runTransform('vectorize')}
          />
          <div className="mx-1 h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <input
              type="number"
              value={printW}
              min={1}
              onChange={e => setPrintW(Number(e.target.value) || 1)}
              className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center"
            />
            <span>×</span>
            <input
              type="number"
              value={printH}
              min={1}
              onChange={e => setPrintH(Number(e.target.value) || 1)}
              className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center"
            />
            <span>in</span>
          </div>
          <ToolButton
            label="DPI Check"
            icon={<Ruler className="h-4 w-4" />}
            busy={busy === 'dpi-check'}
            disabled={!!busy}
            onClick={runDpi}
          />
          <div className="flex-1" />
          <span className="text-xs text-gray-400">
            Session cost: ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

export default function EmbedStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <EmbedStudio />
    </Suspense>
  );
}
