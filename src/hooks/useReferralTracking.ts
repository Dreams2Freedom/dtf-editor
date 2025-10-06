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

      // Call tracking API with format=json to get proper response
      fetch(`/api/affiliate/track?ref=${refCode}&format=json`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(
              '[REFERRAL TRACKING] ✅ Affiliate referral tracked successfully:',
              {
                refCode,
                cookieId: data.cookieId,
              }
            );
          } else {
            console.error(
              '[REFERRAL TRACKING] ❌ Failed to track referral:',
              data.error || 'Unknown error'
            );
          }
        })
        .catch(error => {
          console.error(
            '[REFERRAL TRACKING] ❌ Error tracking referral:',
            error
          );
        });
    }
  }, []); // Run once on mount
}
