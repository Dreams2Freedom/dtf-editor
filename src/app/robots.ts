import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/settings/',
          '/storage/',
          '/support/',
          '/auth/callback',
          '/auth/reset-password',
          '/process/',
          '/clippingmagic-editor',
          '/coming-soon',
          '/simple',
          '/test',
          '/test-*',
          '/auth-debug',
          '/debug-*',
          '/process-test',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
