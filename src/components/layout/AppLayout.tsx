'use client';

import { Header } from './Header';
import { Footer } from './Footer';
import { usePathname } from 'next/navigation';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBannerWrapper';
import TestModeBanner from '@/components/ui/TestModeBanner';
import { SiteHeader } from '@/components/public/landing/SiteHeader';
import { SiteFooter } from '@/components/public/landing/SiteFooter';
import '@/components/public/landing/landing.css';

interface AppLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

// Public marketing pages that should use the redesigned public header/footer
// (the new SiteHeader/SiteFooter) instead of the logged-in app chrome.
const PUBLIC_MARKETING_PAGES = [
  '/about',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/free-dpi-checker',
];

export function AppLayout({ children, showFooter = true }: AppLayoutProps) {
  const pathname = usePathname();

  // Don't show header/footer on auth pages
  const isAuthPage = pathname?.startsWith('/auth/');
  const isAdminPage = pathname?.startsWith('/admin');
  const isClippingMagicEditor = pathname?.includes('/clippingmagic-editor');
  const isHomePage = pathname === '/';
  // /pricing renders its own public/logged-in chrome (see app/pricing),
  // so skip the global app header/footer here to avoid a duplicate header.
  const isPricingPage = pathname === '/pricing';
  const isPublicMarketing = pathname
    ? PUBLIC_MARKETING_PAGES.includes(pathname)
    : false;

  // Hide layout on specific pages
  if (
    isAuthPage ||
    isAdminPage ||
    isClippingMagicEditor ||
    isHomePage ||
    isPricingPage
  ) {
    return <>{children}</>;
  }

  // Public marketing pages: redesigned public header/footer, body unchanged.
  if (isPublicMarketing) {
    return (
      <div className="dtfLanding" id="top">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <>
      <TestModeBanner />
      <ImpersonationBanner />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
        {showFooter && <Footer />}
      </div>
    </>
  );
}
