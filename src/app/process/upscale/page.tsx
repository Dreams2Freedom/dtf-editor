import type { Metadata } from 'next';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import UpscaleClient from './client';

export const metadata: Metadata = {
  title: 'AI Image Upscaler — DTF Editor',
  description:
    'Upscale low-resolution images with AI to make them sharp and print-ready for DTF transfers.',
  robots: { index: false, follow: false },
};

export default function UpscalePage() {
  return (
    <SuspenseWrapper>
      <UpscaleClient />
    </SuspenseWrapper>
  );
}
