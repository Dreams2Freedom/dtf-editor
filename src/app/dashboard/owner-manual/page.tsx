import type { Metadata } from 'next';
import { OwnerManual } from '@/components/manual/OwnerManual';

export const metadata: Metadata = {
  title: "DTF Editor Owner's Manual",
  description:
    'Learn how to prep artwork, remove backgrounds, upscale images, check DPI, change colors, and create cleaner files before you print.',
};

export default function OwnerManualPage() {
  return <OwnerManual />;
}
