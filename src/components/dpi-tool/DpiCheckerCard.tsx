'use client';

import { useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  ImageIcon,
  X,
  Ruler,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

/**
 * DpiCheckerCard — dashboard-styled DPI checker for the logged-in app.
 * Pure client-side: it reads the image's natural pixel size and divides by the
 * chosen print size (pixels ÷ inches = DPI). No upload to the server, no
 * credits, no API calls. The heavier shared DPIChecker (used by the public
 * /free-dpi-checker page) is intentionally left untouched.
 */

type Verdict = {
  kind: 'great' | 'soft' | 'low';
  dpi: number;
  status: string;
  message: string;
};

const trim = (n: number) => (Math.round(n * 10) / 10).toString();

function computeVerdict(
  natW: number,
  natH: number,
  printW: string,
  printH: string
): Verdict | null {
  const w = parseFloat(printW);
  const h = parseFloat(printH);
  if (!natW || !w || w <= 0) return null;
  const dpiW = natW / w;
  const dpiH = h > 0 ? natH / h : dpiW;
  const dpi = Math.round(Math.min(dpiW, dpiH));
  if (dpi >= 250) {
    return {
      kind: 'great',
      dpi,
      status: 'Great for DTF',
      message: `This file should print clean and crisp at ${trim(w)} × ${trim(h)} in.`,
    };
  }
  if (dpi >= 150) {
    return {
      kind: 'soft',
      dpi,
      status: 'Usable but may be soft',
      message:
        'This may work, but fine details could look slightly soft at this size. Try a smaller print size or upscale the file.',
    };
  }
  return {
    kind: 'low',
    dpi,
    status: 'Too low resolution',
    message:
      'This file may print pixelated at this size. Upscale it or choose a smaller print size before ordering.',
  };
}

const VERDICT_STYLE: Record<
  Verdict['kind'],
  { box: string; badge: string; icon: typeof CheckCircle2 }
> = {
  great: {
    box: 'bg-green-50 border-green-200',
    badge: 'text-green-700',
    icon: CheckCircle2,
  },
  soft: {
    box: 'bg-amber-50 border-amber-200',
    badge: 'text-amber-700',
    icon: AlertTriangle,
  },
  low: {
    box: 'bg-red-50 border-red-200',
    badge: 'text-red-700',
    icon: XCircle,
  },
};

export function DpiCheckerCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const [hasFile, setHasFile] = useState(false);
  const [isDrag, setIsDrag] = useState(false);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [fileName, setFileName] = useState('');
  const [thumb, setThumb] = useState<string | null>(null);
  const [printW, setPrintW] = useState('11');
  const [printH, setPrintH] = useState('14');

  const revoke = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  const handleFile = (file: File | undefined | null) => {
    if (!file || !/^image\//.test(file.type)) return;
    revoke();
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ar = w / h;
      let defW = 11;
      if (ar < 1) defW = Math.round(11 * ar);
      setNatW(w);
      setNatH(h);
      setFileName(file.name);
      setThumb(url);
      setPrintW(String(defW || 11));
      setPrintH(String(Math.round((defW / ar) * 10) / 10 || 11));
      setHasFile(true);
    };
    img.src = url;
  };

  const reset = () => {
    revoke();
    setHasFile(false);
    setNatW(0);
    setNatH(0);
    setThumb(null);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDrag(false);
    handleFile(e.dataTransfer?.files?.[0]);
  };

  const verdict = computeVerdict(natW, natH, printW, printH);

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={e => handleFile(e.target.files?.[0])}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Upload artwork
          </h2>

          {!hasFile ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload an image to check DPI"
              onClick={() => inputRef.current?.click()}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={e => {
                e.preventDefault();
                setIsDrag(true);
              }}
              onDragOver={e => {
                e.preventDefault();
                setIsDrag(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                setIsDrag(false);
              }}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isDrag
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-300'
              }`}
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <UploadCloud className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </span>
              <p className="font-medium text-gray-900">Drag &amp; drop an image</p>
              <p className="mb-4 text-sm text-gray-500">or</p>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Choose Image
              </button>
              <p className="mt-3 text-xs text-gray-500">
                PNG, JPG, or WebP supported
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span
                className="h-20 w-20 flex-none overflow-hidden rounded-lg border border-gray-200"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
                  backgroundSize: '14px 14px',
                  backgroundPosition: '0 0,0 7px,7px -7px,-7px 0',
                }}
              >
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={fileName}
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {fileName}
                </p>
                <p className="text-xs text-gray-500">
                  {natW} × {natH} px
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Choose another file
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Print size / results card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Print size &amp; result
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="dpi-w"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Print width (in)
              </label>
              <input
                id="dpi-w"
                type="number"
                min="0.5"
                step="0.5"
                value={printW}
                onChange={e => setPrintW(e.target.value)}
                className="block h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="dpi-h"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Print height (in)
              </label>
              <input
                id="dpi-h"
                type="number"
                min="0.5"
                step="0.5"
                value={printH}
                onChange={e => setPrintH(e.target.value)}
                className="block h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            {!hasFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                <Ruler className="h-4 w-4 text-gray-400" aria-hidden="true" />
                Upload an image to see its DPI for this print size.
              </div>
            ) : verdict ? (
              <div
                className={`rounded-lg border p-4 ${VERDICT_STYLE[verdict.kind].box}`}
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = VERDICT_STYLE[verdict.kind].icon;
                    return (
                      <Icon
                        className={`h-6 w-6 flex-none ${VERDICT_STYLE[verdict.kind].badge}`}
                        aria-hidden="true"
                      />
                    );
                  })()}
                  <div>
                    <p className="text-2xl font-bold leading-none text-gray-900">
                      {verdict.dpi}{' '}
                      <span className="text-sm font-medium text-gray-500">
                        DPI
                      </span>
                    </p>
                    <p
                      className={`text-sm font-semibold ${VERDICT_STYLE[verdict.kind].badge}`}
                    >
                      {verdict.status}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">{verdict.message}</p>

                {verdict.kind !== 'great' && (
                  <Link
                    href="/process?operation=upscale"
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
                    Improve with Image Upscaling
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Enter a print width to calculate DPI.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          What your result means
        </h2>
        <ul className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 flex-none text-blue-600"
              aria-hidden="true"
            />
            Higher DPI usually means a sharper print.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 flex-none text-blue-600"
              aria-hidden="true"
            />
            For DTF transfers, 300 DPI is ideal.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 flex-none text-blue-600"
              aria-hidden="true"
            />
            Lower DPI files may still work, but small details can look soft or
            pixelated.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 flex-none text-blue-600"
              aria-hidden="true"
            />
            If your file is too low resolution, try the Image Upscaling tool.
          </li>
        </ul>
      </div>
    </div>
  );
}
