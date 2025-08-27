'use client';

import { useState, useEffect } from 'react';

interface ImpersonationStatus {
  isImpersonating: boolean;
  impersonatedUserId?: string;
  impersonatedUserEmail?: string;
  originalAdminEmail?: string;
}

export function useImpersonation(): ImpersonationStatus & { endImpersonation: () => Promise<void> } {
  const [status, setStatus] = useState<ImpersonationStatus>({
    isImpersonating: false
  });

  useEffect(() => {
    checkImpersonationStatus();
  }, []);

  const checkImpersonationStatus = async () => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          isImpersonating: data.isImpersonating,
          impersonatedUserId: data.impersonatedUserId,
          impersonatedUserEmail: data.impersonatedUserEmail,
          originalAdminEmail: data.originalAdminEmail
        });
      }
    } catch (error) {
      console.error('Error checking impersonation status:', error);
    }
  };

  const endImpersonation = async () => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to end impersonation');
      }

      // Refresh the page to clear impersonation
      window.location.href = '/admin/users';
    } catch (error) {
      console.error('Error ending impersonation:', error);
      throw error;
    }
  };

  return {
    ...status,
    endImpersonation
  };
}