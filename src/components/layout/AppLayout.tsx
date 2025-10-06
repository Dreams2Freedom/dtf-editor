'use client';

import { Header } from './Header';
import { Footer } from './Footer';
import { usePathname } from 'next/navigation';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBannerWrapper';
import TestModeBanner from '@/components/ui/TestModeBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, showFooter = true }: AppLayoutProps) {
  const pathname = usePathname();

  // Don't show header/footer on auth pages
  const isAuthPage = pathname?.startsWith('/auth/');
  const isAdminPage = pathname?.startsWith('/admin');
  const isClippingMagicEditor = pathname?.includes('/clippingmagic-editor');

  // Hide layout on specific pages
  if (isAuthPage || isAdminPage || isClippingMagicEditor) {
    return <>{children}</>;
  }

  return (
    <>
      <TestModeBanner />
      <ImpersonationBanner />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        {showFooter && <Footer />}
      </div>
    </>
  );
}
