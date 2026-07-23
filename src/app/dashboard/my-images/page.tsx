'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { ClientOnly } from '@/components/auth/ClientOnly';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ImageGalleryEnhanced } from '@/components/image/ImageGalleryEnhanced';

/**
 * Full image library page. Houses the user's complete gallery by reusing the
 * existing ImageGalleryEnhanced component (its own data fetching, search,
 * loading and empty states) — no duplicate storage logic.
 */
export default function MyImagesPage() {
  const { user, loading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingPage message="Loading your images..." />;
  }
  if (!user) {
    return null;
  }

  return (
    <ClientOnly fallback={<LoadingPage message="Loading..." />}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Breadcrumb
            items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Images' }]}
          />

          <div className="mt-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Images</h1>
            <p className="mt-1 text-sm text-gray-600">
              View, download, and reuse your uploaded artwork.
            </p>
          </div>

          <ImageGalleryEnhanced />
        </div>
      </div>
    </ClientOnly>
  );
}
