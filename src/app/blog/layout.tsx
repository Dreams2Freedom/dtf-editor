import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — DTF Editor',
  description:
    'Tips, tutorials, and guides on DTF printing: preparing artwork, upscaling images, removing backgrounds, vectorizing logos, and getting perfect transfers.',
  alternates: { canonical: '/blog' },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
