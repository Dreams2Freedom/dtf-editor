import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import BackgroundRemovalClient from './client';

export default function BackgroundRemovalPage() {
  return (
    <SuspenseWrapper>
      <BackgroundRemovalClient />
    </SuspenseWrapper>
  );
}
