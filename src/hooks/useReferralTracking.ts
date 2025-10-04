/**
 * Hook for tracking affiliate referrals on page load
 * Detects ?ref= parameter and calls tracking API
 */

import { useEffect } from 'react';

export function useReferralTracking() {
  useEffect(() => {
    // Read ref parameter directly from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      console.log('[REFERRAL TRACKING] Detected ref parameter:', refCode);

      // Call tracking API
      fetch(`/api/affiliate/track?ref=${refCode}`)
        .then(response => {
          if (response.ok) {
            console.log('[REFERRAL TRACKING] Affiliate referral tracked successfully:', refCode);
          } else {
            console.warn('[REFERRAL TRACKING] Failed to track referral. Status:', response.status);
          }
        })
        .catch(error => {
          console.error('[REFERRAL TRACKING] Error tracking referral:', error);
        });
    }
  }, []); // Run once on mount
}
