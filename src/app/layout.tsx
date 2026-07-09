import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AppLayout } from '@/components/layout/AppLayout';
import { MetaPixelRouteTracker } from '@/components/analytics/MetaPixelRouteTracker';

// Meta (Facebook) Pixel ID — used for ad-performance tracking site-wide.
const META_PIXEL_ID = '1537210417861525';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DTF Editor - AI-Powered Image Processing',
  description:
    'Create print-ready DTF files with AI-powered image processing tools. Upscale, remove backgrounds, vectorize, and generate images.',
  keywords:
    'DTF, direct to film, image processing, AI, upscaling, background removal, vectorization',
  authors: [{ name: 'DTF Editor Team' }],
  creator: 'DTF Editor',
  publisher: 'DTF Editor',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/branding/dtf-editor-favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/branding/dtf-editor-favicon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'DTF Editor - AI-Powered Image Processing',
    description:
      'Create print-ready DTF files with AI-powered image processing tools.',
    url: '/',
    siteName: 'DTF Editor',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DTF Editor - AI-Powered Image Processing',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DTF Editor - AI-Powered Image Processing',
    description:
      'Create print-ready DTF files with AI-powered image processing tools.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`} suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
            <ToastContainer />
          </AuthProvider>
        </ErrorBoundary>

        {/* Meta Pixel Code — loads on every page for ad-performance tracking. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
        {/* Fires PageView on client-side route changes (SPA navigations). */}
        <MetaPixelRouteTracker />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </body>
    </html>
  );
}
