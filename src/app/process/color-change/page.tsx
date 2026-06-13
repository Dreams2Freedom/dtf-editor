import type { Metadata } from 'next';
import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import ColorChangeClient from './client';

export const metadata: Metadata = {
  title: 'Color Change Tool — DTF Editor',
  description:
    'Recolor designs and artwork for DTF transfers without re-creating them.',
  robots: { index: false, follow: false },
};

export default function ColorChangePage() {
  return (
    <SuspenseWrapper>
      <ColorChangeClient />
    </SuspenseWrapper>
  );
}
