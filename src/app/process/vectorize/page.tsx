import type { Metadata } from 'next';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import VectorizeClient from './client';

export const metadata: Metadata = {
  title: 'Image Vectorizer — DTF Editor',
  description:
    'Convert raster images to crisp vectors for clean, scalable DTF transfer prints.',
  robots: { index: false, follow: false },
};

export default function VectorizePage() {
  return (
    <SuspenseWrapper>
      <VectorizeClient />
    </SuspenseWrapper>
  );
}
