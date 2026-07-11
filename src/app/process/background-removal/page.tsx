import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import BackgroundRemovalClient from './client';

/**
 * Phase 2.1 note: this route stays standalone (NOT redirected to /studio)
 * because it's the ClippingMagic-powered "Advanced BG Removal (1 credit)"
 * escape hatch — a different provider from the in-house Studio plugin
 * at /studio?tool=bg-removal. The two are intentionally different tools
 * with different pricing and quality characteristics.
 */
export default function BackgroundRemovalPage() {
  return (
    <SuspenseWrapper>
      <BackgroundRemovalClient />
    </SuspenseWrapper>
  );
}
