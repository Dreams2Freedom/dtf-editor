import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DTF Editor',
    short_name: 'DTF Editor',
    description:
      'Create print-ready DTF files with AI-powered image processing tools.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#013193',
    icons: [
      {
        src: '/branding/dtf-editor-favicon.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
