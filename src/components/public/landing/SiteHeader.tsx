'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import styles from './SiteHeader.module.css';

const NAV = [
  { label: 'Tools', href: '#tools' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'DPI Checker', href: '#dpi' },
  { label: 'FAQ', href: '#faq' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.hdr}>
      <div className={`wrap ${styles.hdr__inner}`}>
        <a className="brand" href="#top" aria-label="DTF Editor home">
          <span className="brand__mark">
            D<b>T</b>F
          </span>
          <span>DTF Editor</span>
        </a>

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
            Start a Hobbyist Trial
          </a>
          <a className="btn btn--ghost btn--block" href="#dpi" onClick={() => setOpen(false)}>
            Check DPI Free
          </a>
        </div>
      </div>
    </header>
  );
}
