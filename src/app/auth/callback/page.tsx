'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import styles from '@/components/auth/Auth.module.css';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClientSupabaseClient();
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No session found. Please try signing in again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();
  }, [router]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <Loader2
            className="h-12 w-12 animate-spin"
            style={{ color: '#013193' }}
            aria-hidden="true"
          />
        );
      case 'success':
        return (
          <CheckCircle
            className="h-12 w-12"
            style={{ color: '#16a34a' }}
            aria-hidden="true"
          />
        );
      case 'error':
        return (
          <XCircle
            className="h-12 w-12"
            style={{ color: '#dc2626' }}
            aria-hidden="true"
          />
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Signing you in…';
      case 'success':
        return "You're signed in";
      case 'error':
        return 'Something went wrong';
    }
  };

  return (
    <AuthLayout>
      <div className={styles.header}>
        <div className={styles.statusIcon} style={{ background: 'transparent' }}>
          {getIcon()}
        </div>
        <h1 className={styles.title}>{getTitle()}</h1>
        <p className={styles.subtitle}>{message}</p>
      </div>

      {status === 'error' && (
        <button
          onClick={() => router.push('/auth/login')}
          className={styles.btnPrimary}
        >
          Back to sign in
        </button>
      )}
    </AuthLayout>
  );
}
