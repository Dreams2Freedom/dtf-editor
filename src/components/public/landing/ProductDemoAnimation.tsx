'use client';

import { useEffect, useId, useState } from 'react';
import {
  Lock,
  WandSparkles,
  UploadCloud,
  FileImage,
  Ruler,
  Scissors,
  Sparkles,
  Spline,
  Loader2,
  Check,
  Layers,
  Gauge,
  Download,
} from 'lucide-react';
import styles from './ProductDemoAnimation.module.css';

// [phase, holdMs] — ~12s loop
const SEQ: ReadonlyArray<readonly [number, number]> = [
  [0, 1200],
  [1, 1300],
  [2, 2000],
  [3, 1900],
  [4, 1700],
  [5, 1900],
  [6, 2200],
];

const STEPS = [
  'Artwork uploaded',
  'Background removed',
  'Image improved',
  'Vector ready',
  'Checking DPI',
  'Ready to download',
];

const QUALITY = ['Resolution', 'Color & Contrast', 'Edge Sharpness', 'File Format'];

const DPI_TARGET = 285;

/** The DTF Editor mountain-badge artwork, recreated as inline SVG so the
 *  animation can blur it, sharpen it, sit it on transparency, etc. */
function MountainBadge() {
  const clip = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="88" height="88" rx="20" fill="#fff" stroke="#15294d" strokeWidth="5" />
      <circle cx="50" cy="50" r="33" fill="#fff" stroke="#15294d" strokeWidth="3.5" />
      <clipPath id={clip}>
        <circle cx="50" cy="50" r="31.5" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <circle cx="64" cy="36" r="10" fill="#ee8a1e" />
        <rect x="15" y="64" width="70" height="22" fill="#15294d" />
        <path d="M18 70 L40 41 L62 70 Z" fill="#15294d" />
        <path d="M47 70 L64 49 L83 70 Z" fill="#15294d" />
        <path d="M34 52 L40 41 L46 52 L42.5 49 L40 52.5 L37.5 49 Z" fill="#fff" />
        <path d="M56 57 L64 49 L72 57 L68.5 54.5 L65 57.5 L61.5 54.5 Z" fill="#fff" />
        <rect x="31" y="71" width="38" height="2.6" rx="1.3" fill="#fff" />
        <rect x="27" y="76" width="46" height="2.6" rx="1.3" fill="#fff" />
        <rect x="33" y="81" width="34" height="2.6" rx="1.3" fill="#fff" />
      </g>
    </svg>
  );
}

/** Vector control-point overlay used in the "Vector ready" stage. */
function VectorNodes() {
  const nodes: Array<[number, number]> = [
    [40, 41],
    [18, 70],
    [62, 70],
    [64, 49],
    [83, 70],
    [48, 70],
  ];
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path
        d="M18 70 L40 41 L62 70 M47 70 L64 49 L83 70"
        stroke="#013193"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        opacity="0.7"
      />
      {nodes.map(([x, y], i) => (
        <rect
          key={i}
          x={x - 2.4}
          y={y - 2.4}
          width="4.8"
          height="4.8"
          rx="1"
          fill="#fff"
          stroke="#013193"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
}

export function ProductDemoAnimation() {
  const [phase, setPhase] = useState(0);
  const [dpi, setDpi] = useState(DPI_TARGET);
  const [reduced, setReduced] = useState(false);

  // main loop
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReduced(true);
      setPhase(6);
      setDpi(DPI_TARGET);
      return;
    }
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const [p, hold] = SEQ[idx];
      setPhase(p);
      timer = setTimeout(() => {
        idx = (idx + 1) % SEQ.length;
        tick();
      }, hold);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  // DPI count-up during the DPI-check phase
  useEffect(() => {
    if (reduced || phase !== 5) return;
    const step = Math.ceil(DPI_TARGET / 22);
    let cur = 0;
    setDpi(0);
    const t = setInterval(() => {
      cur += step;
      if (cur >= DPI_TARGET) {
        cur = DPI_TARGET;
        clearInterval(t);
      }
      setDpi(cur);
    }, 45);
    return () => clearInterval(t);
  }, [phase, reduced]);

  const stepClass = (i: number) => {
    if (phase >= 6 || i < phase - 1) return styles['is-done'];
    if (i === phase - 1) return styles['is-active'];
    return '';
  };
  const pct = phase >= 6 ? 100 : (Math.max(0, Math.min(6, phase)) / 6) * 100;

  return (
    <div className={styles['demo-scene']}>
      <div className={styles['demo-scene__glow']} aria-hidden="true" />
      <div className={styles['demo-scene__dots']} aria-hidden="true" />
      <div className={`${styles.float} ${styles['float--a']}`} aria-hidden="true">
        <FileImage size={14} /> mountain-badge.png
      </div>
      <div className={`${styles.float} ${styles['float--b']}`} aria-hidden="true">
        <Ruler size={14} /> 11 in wide
      </div>
      <div className={`${styles.float} ${styles['float--c']}`} aria-hidden="true">
        <span className={styles.float__dot} /> 300 DPI target
      </div>
      <div className={`${styles.float} ${styles['float--d']}`} aria-hidden="true">
        <Download size={14} /> PNG export
      </div>

      <div
        className={styles.demo}
        data-phase={phase}
        role="img"
        aria-label="Animated product preview: DTF Editor takes a mountain-badge logo and walks it through a print-prep workflow — removing the background to transparency, sharpening the image, vectorizing the edges, confirming 285 DPI (great for DTF), and exporting a clean, print-ready transparent PNG."
      >
        <div className={styles.demo__bar}>
          <span className={styles.demo__dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.demo__addr}>
            <Lock size={13} aria-hidden="true" /> app.dtfeditor.com/prep
          </span>
          <span className={styles.demo__label}>
            <span className={styles.pulse} /> DTF Artwork Prep Assistant{' '}
            <em className={styles.demo__preview}>Preview</em>
          </span>
        </div>

        <div className={styles.demo__prompt}>
          <span className={styles.chip}>
            <WandSparkles size={14} aria-hidden="true" /> Assistant
          </span>
          <q>Prep this mountain badge for an 11 inch DTF transfer</q>
        </div>

        <div className={styles.demo__body}>
          <div className={styles.demo__stage}>
            <div className={styles.dz}>
              <div className={styles.dz__inner}>
                <UploadCloud size={30} aria-hidden="true" />
                <span>Drop your artwork to begin</span>
              </div>
            </div>

            <div className={styles.filecard}>
              <span className={styles.filecard__ic}>
                <FileImage size={16} aria-hidden="true" />
              </span>
              <span className={styles.filecard__meta}>
                <b>mountain-badge.png</b>
                <small>0.9 MB</small>
              </span>
            </div>

            <div className={styles.art}>
              <div className={styles.art__photo} />
              <div className={styles.art__checker} />
              <div className={`${styles.art__layer} ${styles.art__emblem}`}>
                <MountainBadge />
              </div>
              <div className={`${styles.art__layer} ${styles.art__sharp}`}>
                <MountainBadge />
              </div>
              <div className={`${styles.art__layer} ${styles.art__vector}`}>
                <VectorNodes />
              </div>
              <div className={styles.art__divider} />
              <div className={styles.art__scan} />
              <span className={styles.art__png}>PNG</span>
            </div>

            <div className={styles.sbadges}>
              <span className={`${styles.sbadge} ${styles['sbadge--ok']}`} data-b="bgremoved">
                <Scissors size={12} aria-hidden="true" /> Background removed
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--ok']}`} data-b="improved">
                <Sparkles size={12} aria-hidden="true" /> Image improved
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--accent']}`} data-b="scale">
                2.7× sharper
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--info']}`} data-b="vector">
                <Spline size={12} aria-hidden="true" /> Vector ready
              </span>
            </div>
          </div>

          <div className={styles.demo__panel}>
            <div className={styles.demo__progress}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <ul className={styles.demo__steps}>
              {STEPS.map((label, i) => (
                <li key={label} className={`${styles.dstep} ${stepClass(i)}`}>
                  <span className={styles.dstep__ic}>
                    <span className={styles.dstep__num}>{i + 1}</span>
                    <Loader2 className={styles.dstep__spin} size={13} aria-hidden="true" />
                    <Check className={styles.dstep__check} size={13} aria-hidden="true" />
                  </span>{' '}
                  {label}
                </li>
              ))}
            </ul>

            <div className={styles.rzone}>
              <div className={styles.rzone__dpi}>
                <div className={styles.gauge}>
                  <svg className={styles.gauge__svg} viewBox="0 0 100 100" aria-hidden="true">
                    <circle className={styles.gauge__track} cx="50" cy="50" r="42" />
                    <circle className={styles.gauge__fill} cx="50" cy="50" r="42" />
                  </svg>
                  <div className={styles.gauge__val}>
                    <b>{dpi}</b>
                    <small>DPI</small>
                  </div>
                </div>
                <div className={styles.rzone__quality}>
                  <div className={styles.rzone__verdict}>
                    <b>Good for DTF</b>
                    <span>285 DPI at 11 in wide</span>
                  </div>
                  <ul className={styles.qlist}>
                    {QUALITY.map((q, i) => (
                      <li key={q} style={{ transitionDelay: `${0.15 + i * 0.12}s` }}>
                        <Check size={12} aria-hidden="true" /> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.rzone__ready}>
                <div className={styles.rzone__chips}>
                  <span className={styles.chip2}>
                    <Layers size={12} aria-hidden="true" /> Transparent PNG
                  </span>
                  <span className={styles.chip2}>
                    <Gauge size={12} aria-hidden="true" /> 300 DPI guidance
                  </span>
                  <span className={styles.chip2}>
                    <Check size={12} aria-hidden="true" /> Ready
                  </span>
                </div>
                <button className={styles.rzone__btn} type="button" tabIndex={-1} aria-hidden="true">
                  <Download size={16} /> Print-ready PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
