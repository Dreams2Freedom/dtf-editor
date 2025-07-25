import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DTF Editor - AI-Powered Image Processing',
  description: 'Create print-ready DTF files with AI-powered image processing tools. Upscale, remove backgrounds, vectorize, and generate images.',
  keywords: 'DTF, direct to film, image processing, AI, upscaling, background removal, vectorization',
  authors: [{ name: 'DTF Editor Team' }],
  creator: 'DTF Editor',
  publisher: 'DTF Editor',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'DTF Editor - AI-Powered Image Processing',
    description: 'Create print-ready DTF files with AI-powered image processing tools.',
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
    description: 'Create print-ready DTF files with AI-powered image processing tools.',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
