import type { Metadata } from 'next';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import BackgroundRemovalClient from './client';

export const metadata: Metadata = {
  title: 'Background Removal — DTF Editor',
  description:
    'Remove image backgrounds cleanly for transparent, print-ready DTF transfers.',
  robots: { index: false, follow: false },
};

export default function BackgroundRemovalPage() {
  return (
    <SuspenseWrapper>
      <BackgroundRemovalClient />
    </SuspenseWrapper>
  );
}
