import type { Metadata } from 'next';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import ProcessClient from './client';

export const metadata: Metadata = {
  title: 'Image Processing Tools — DTF Editor',
  description:
    'Upscale, remove backgrounds, vectorize, and prepare images for print-ready DTF transfers.',
  robots: { index: false, follow: false },
};

export default function ProcessPage() {
  return (
    <SuspenseWrapper>
      <ProcessClient />
    </SuspenseWrapper>
  );
}
