'use client';

import { useEffect, useState } from 'react';
import {
  Lock,
  WandSparkles,
  UploadCloud,
  FileImage,
  Ruler,
  TriangleAlert,
  ScanSearch,
  Scissors,
  Sparkles,
  Loader2,
  Check,
  Layers,
  Gauge,
  Download,
} from 'lucide-react';
import styles from './ProductDemoAnimation.module.css';

// [phase, holdMs] — ~12s loop
const SEQ: ReadonlyArray<readonly [number, number]> = [
  [0, 1500],
  [1, 1500],
  [2, 2400],
  [3, 1500],
  [4, 1700],
  [5, 1900],
  [6, 2500],
];

const STEPS = [
  'Artwork uploaded',
  'Analyzing artwork',
  'Background removed',
  'Image improved',
  'Checking DPI',
  'Ready to download',
];

const DPI_TARGET = 285;

/** The SUMMIT CO emblem reused for the blurry + sharpened layers. */
function Emblem() {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="45" stroke="#0f1b3d" strokeWidth="3" />
      <circle cx="50" cy="50" r="37" stroke="#0f1b3d" strokeWidth="1.5" opacity=".5" />
      <circle cx="62" cy="33" r="7" fill="#d7870a" />
      <path d="M22 64 L40 40 L52 56 L63 42 L78 64 Z" fill="#0f1b3d" />
      <path d="M40 40 L52 56 L46 56 L36 47 Z" fill="#1f3b86" />
      <rect x="26" y="70" width="48" height="13" rx="2" fill="#0f1b3d" />
      <text
        x="50"
        y="79.5"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="8.5"
        fontWeight="800"
        fill="#fff"
        letterSpacing=".5"
      >
        SUMMIT CO
      </text>
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

  // DPI count-up during phase 5
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
        <FileImage size={14} /> logo.png
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
        aria-label="Animated product preview: DTF Editor turns a low-resolution logo with a busy background into a clean, transparent, print-ready PNG. It removes the background, sharpens the image, and confirms 285 DPI — great for DTF."
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
          <q>Fix this logo for an 11 inch DTF transfer</q>
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
                <b>logo-for-shirt.png</b>
                <small>1.2 MB</small>
              </span>
            </div>

            <div className={styles.art}>
              <div className={styles.art__photo} />
              <div className={styles.art__checker} />
              <div className={`${styles.art__layer} ${styles.art__emblem}`}>
                <Emblem />
              </div>
              <div className={`${styles.art__layer} ${styles.art__sharp}`}>
                <Emblem />
              </div>
              <div className={styles.art__divider} />
              <div className={styles.art__scan} />
            </div>

            <div className={styles.sbadges}>
              <span className={`${styles.sbadge} ${styles['sbadge--warn']}`} data-b="lowres">
                <TriangleAlert size={12} aria-hidden="true" /> Low resolution
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--info']}`} data-b="bgfound">
                <ScanSearch size={12} aria-hidden="true" /> Background found
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--info']}`} data-b="size">
                <Ruler size={12} aria-hidden="true" /> Checking print size
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--ok']}`} data-b="bgremoved">
                <Scissors size={12} aria-hidden="true" /> Background removed
              </span>
              <span className={`${styles.sbadge} ${styles['sbadge--ok']}`} data-b="improved">
                <Sparkles size={12} aria-hidden="true" /> Image improved
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
              <div className={styles.rzone__gauge}>
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
                <div className={styles.rzone__gaugetext}>
                  <b>Great for DTF</b>
                  <span>285 DPI at 11 in wide</span>
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
                  <Download size={16} /> Download file
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
