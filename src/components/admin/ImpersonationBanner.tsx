'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, X, Shield } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ImpersonationData {
  originalAdminEmail: string;
  impersonatedUserId: string;
  impersonatedUserEmail: string;
  startedAt: string;
}

export function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] =
    useState<ImpersonationData | null>(null);
  const [ending, setEnding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for impersonation session
    checkImpersonationStatus();
  }, []);

  const checkImpersonationStatus = async () => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isImpersonating) {
          setImpersonationData({
            originalAdminEmail: data.originalAdminEmail,
            impersonatedUserId: data.impersonatedUserId,
            impersonatedUserEmail: data.impersonatedUserEmail,
            startedAt: data.startedAt,
          });
        }
      }
    } catch (error) {
      console.error('Error checking impersonation status:', error);
    }
  };

  const endImpersonation = async () => {
    setEnding(true);

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to end impersonation');
      }

      toast.success('Impersonation session ended');

      // Redirect back to admin
      router.push('/admin/users');
      router.refresh();
    } catch (error) {
      console.error('Error ending impersonation:', error);
      toast.error('Failed to end impersonation session');
    } finally {
      setEnding(false);
    }
  };

  if (!impersonationData) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin Impersonation Mode</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span>
                Viewing as:{' '}
                <strong>{impersonationData.impersonatedUserEmail}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={endImpersonation}
            disabled={ending}
            className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-md hover:bg-orange-50 transition-colors font-medium text-sm"
          >
            <X className="w-4 h-4" />
            {ending ? 'Ending...' : 'End Impersonation'}
          </button>
        </div>
      </div>
    </div>
  );
}
