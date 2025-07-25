'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();

  // run only once, after the browser mounted the page
  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? '/dashboard' : '/auth/login');
    }
  }, [loading, isAuthenticated, router]);

  /* ★ keep output identical on server and client ★ */
  return null;
}
