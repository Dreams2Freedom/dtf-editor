'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import styles from './SiteHeader.module.css';

// Absolute hashes (/#x) route home from sub-pages; the homepage's HashScroll
// handler then scrolls to the section (accounting for the sticky-header offset),
// so these links work both on the landing page and from other pages.
const NAV = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Tools', href: '/#tools' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'DPI Checker', href: '/#dpi' },
  { label: 'FAQ', href: '/#faq' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.hdr}>
      <div className={`wrap ${styles.hdr__inner}`}>
        <Link className="brand" href="/" aria-label="DTF Editor home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/dtf-editor-logo.png" alt="DTF Editor" className="brand__logo" />
        </Link>

        <nav className={styles.hdr__nav} aria-label="Primary">
          {NAV.map(item => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.hdr__actions}>
          <a className={`btn btn--ghost btn--sm ${styles.hdr__signin}`} href="/auth/login">
            Sign in
          </a>
          <a className="btn btn--primary btn--sm" href="/auth/signup">
            Start a Trial
          </a>
          <button
            className={styles.hdr__burger}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`${styles.mnav} ${open ? styles['is-open'] : ''}`}>
        {NAV.map(item => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
        <a href="/auth/login" onClick={() => setOpen(false)}>
          Sign in
        </a>
        <div className={styles.mnav__cta}>
          <a className="btn btn--primary btn--block" href="/auth/signup" onClick={() => setOpen(false)}>
            Get Started Free
          </a>
          <Link className="btn btn--ghost btn--block" href="/#dpi" onClick={() => setOpen(false)}>
            Check DPI Free
          </Link>
        </div>
      </div>
    </header>
  );
}
