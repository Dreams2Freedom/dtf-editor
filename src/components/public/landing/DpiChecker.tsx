'use client';

import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, X, Eye, ShieldCheck, Hash, Palette } from 'lucide-react';
import styles from './DpiChecker.module.css';

const BENEFITS = [
  { icon: Eye, label: 'Know before you print or press' },
  { icon: ShieldCheck, label: 'Avoid pixelated, wasted transfers' },
  { icon: Hash, label: 'Get exact DPI numbers for your size' },
  { icon: Palette, label: 'Great for Canva, Kittl & customer-uploaded artwork' },
];

const trim = (n: number) => (Math.round(n * 10) / 10).toString();

type Verdict = {
  kind: 'great' | 'soft' | 'low';
  dpi: number;
  status: string;
  message: string;
};

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

export function DpiChecker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const [hasFile, setHasFile] = useState(false);
  const [isDrag, setIsDrag] = useState(false);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [fileName, setFileName] = useState('artwork.png');
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
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDrag(false);
    handleFile(e.dataTransfer?.files?.[0]);
  };

  const verdict = computeVerdict(natW, natH, printW, printH);
  const verdictClass = verdict
    ? styles[`is-${verdict.kind}` as 'is-great' | 'is-soft' | 'is-low']
    : '';

  return (
    <section className="section" id="dpi">
      <div className="wrap">
        <div className={styles.dpi__grid}>
          <div>
            <span className="eyebrow">Free, no account needed</span>
            <h2 className="h-sec">Check Your Image DPI Free</h2>
            <p className="sub">
              Upload your design, enter the size you want to print, and see
              whether it is likely to print crisp or pixelated — before you order
              transfers.
            </p>
            <ul className={styles.dpi__benefits}>
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <span className={styles.ic}>
                    <Icon size={14} aria-hidden="true" />
                  </span>{' '}
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.checker}>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={e => handleFile(e.target.files?.[0])}
            />

            {!hasFile ? (
              <div
                className={`${styles.checker__drop} ${isDrag ? styles['is-drag'] : ''}`}
                tabIndex={0}
                role="button"
                aria-label="Upload image to check DPI"
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
              >
                <div className={styles.ic}>
                  <UploadCloud size={24} aria-hidden="true" />
                </div>
                <h3>Upload Image</h3>
                <p className={styles.checker__or}>or drop a file</p>
                <button
                  className="btn btn--blue btn--sm"
                  type="button"
                  aria-label="Choose an image from your device to check DPI"
                  onClick={e => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Choose Image
                </button>
                <div className={styles.checker__hint}>
                  <b>PNG, JPG, or WebP supported</b> · No credit card required
                </div>
              </div>
            ) : (
              <div className={styles.checker__result}>
                <div className={styles.cres__head}>
                  <div className={styles.cres__thumb}>
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={fileName} />
                    )}
                  </div>
                  <div className={styles.cres__meta}>
                    <div className={styles.fn}>{fileName}</div>
                    <div className={styles.px}>
                      {natW} × {natH} px
                    </div>
                  </div>
                  <button
                    className={styles.cres__reset}
                    onClick={reset}
                    aria-label="Choose another file"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.cres__sizes}>
                  <div className={styles.field}>
                    <label htmlFor="dpi-w">Print width</label>
                    <div className={styles.field__in}>
                      <input
                        id="dpi-w"
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={printW}
                        onChange={e => setPrintW(e.target.value)}
                      />
                      <span className={styles.unit}>in</span>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="dpi-h">Print height</label>
                    <div className={styles.field__in}>
                      <input
                        id="dpi-h"
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={printH}
                        onChange={e => setPrintH(e.target.value)}
                      />
                      <span className={styles.unit}>in</span>
                    </div>
                  </div>
                </div>

                <div className={`${styles.cres__verdict} ${verdictClass}`}>
                  <div className={styles.top}>
                    <span className={styles.dpi}>{verdict?.dpi ?? '—'}</span>
                    <span className={styles.status}>{verdict?.status ?? ''}</span>
                  </div>
                  <p>{verdict?.message ?? ''}</p>
                </div>

                <div className={styles.checker__cta}>
                  <a className="btn btn--blue btn--block" href="/auth/signup">
                    Need to fix it? Get started free
                  </a>
                </div>
              </div>
            )}

            <p className={styles.checker__trust}>
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
