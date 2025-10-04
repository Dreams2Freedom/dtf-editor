/**
 * Hook for tracking affiliate referrals on page load
 * Detects ?ref= parameter and calls tracking API
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function useReferralTracking() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      // Call tracking API
      fetch(`/api/affiliate/track?ref=${refCode}`)
        .then(response => {
          if (response.ok) {
            console.log('[REFERRAL TRACKING] Affiliate referral tracked:', refCode);
          } else {
            console.warn('[REFERRAL TRACKING] Failed to track referral:', response.status);
          }
        })
        .catch(error => {
          console.error('[REFERRAL TRACKING] Error tracking referral:', error);
        });
    }
  }, [searchParams]);
}
