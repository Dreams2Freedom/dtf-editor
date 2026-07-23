'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import styles from './FaqAccordion.module.css';

const FAQS = [
  {
    q: 'What does DTF Editor do?',
    a: 'DTF Editor helps you prepare artwork for Direct-to-Film transfers. Upload a design and remove backgrounds, upscale low-resolution files, vectorize logos, generate new artwork, or check DPI — all framed around getting a clean, print-ready file.',
  },
  {
    q: 'What is DPI and why does it matter?',
    a: 'DPI (dots per inch) describes how much detail your file has at a given print size. Too low and your transfer looks pixelated or fuzzy. For DTF we recommend around 300 DPI at your final print size — the free checker tells you instantly.',
  },
  {
    q: 'Can this fix blurry artwork?',
    a: "The upscaling tool can make low-resolution artwork cleaner and sharper. It won't invent detail that was never there, but it noticeably improves most files before printing.",
  },
  {
    q: 'Do I need a transparent background for DTF?',
    a: 'Usually, yes. DTF transfers print only the artwork itself, so a transparent PNG keeps unwanted background out of the press. Background Removal exports a transparent PNG for you.',
  },
  {
    q: 'What happens if processing fails?',
    a: "If a tool fails to process your file, the credit is automatically refunded to your account. You're never charged for a result you didn't get.",
  },
  {
    q: 'How do credits work?',
    a: 'Credits are used to run specific tools inside DTF Editor — like background removal, image upscaling, vectorization, and AI image generation. Monthly plans include a set number of credits each month, but if you would rather not subscribe, you can buy credit packs instead and use those credits on the paid tools you need. The Free DPI Checker never uses credits and is always free. And if a processing job fails, the credit is automatically refunded.',
  },
  {
    q: 'Do credits roll over?',
    a: "Monthly plan credits don't roll over month to month. Credits purchased as Pay As You Go packs never expire, so buy those if you process artwork occasionally.",
  },
];

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState<number>(0);

  useEffect(() => {
    setMaxH(open && ref.current ? ref.current.scrollHeight : 0);
  }, [open]);

  return (
    <div className={`${styles.acc} ${open ? styles['is-open'] : ''}`}>
      <button
        className={styles.acc__q}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {q}
        <ChevronDown size={20} aria-hidden="true" />
      </button>
      <div ref={ref} className={styles.acc__a} style={{ maxHeight: `${maxH}px` }}>
        <p>{a}</p>
      </div>
    </div>
  );
}

export function FaqAccordion() {
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head section-head--center">
          <h2 className="h-sec">Questions, answered</h2>
          <p className="sub">New to DTF artwork prep? Start here.</p>
        </div>
        <div className={styles.faq}>
          {FAQS.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} />
          ))}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p className="sub" style={{ marginBottom: 14 }}>
            Don&rsquo;t see your question? Look here.
          </p>
          <Link
            href="/dashboard/owner-manual"
            className="btn btn--primary btn--lg"
          >
            Open the Owner&rsquo;s Manual
          </Link>
        </div>
      </div>
    </section>
  );
}
