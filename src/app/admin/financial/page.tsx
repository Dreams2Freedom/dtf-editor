'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FinancialPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to transactions page as the default financial view
    router.replace('/admin/financial/transactions');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}