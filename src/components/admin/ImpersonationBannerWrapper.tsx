'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled to prevent hydration mismatches
export const ImpersonationBanner = dynamic(
  () => import('./ImpersonationBanner').then(mod => mod.ImpersonationBanner),
  { 
    ssr: false,
    loading: () => null 
  }
);