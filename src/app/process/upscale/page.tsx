import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import UpscaleClient from './client';

export default function UpscalePage() {
  return (
    <SuspenseWrapper>
      <UpscaleClient />
    </SuspenseWrapper>
  );
}
