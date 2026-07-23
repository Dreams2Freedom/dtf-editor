'use client';

import React from 'react';
import Link from 'next/link';
import styles from '@/components/auth/Auth.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared shell for the public auth flow (login, signup, forgot/reset
 * password). Light-mode, centered brand card matching the homepage
 * redesign. Each form supplies its own title/subtitle so dynamic
 * success states stay self-contained.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.brandLink} aria-label="DTF Editor home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/dtf-editor-logo.png"
            alt="DTF Editor"
            className={styles.logo}
          />
        </Link>

        {children}
      </div>
    </div>
  );
}
