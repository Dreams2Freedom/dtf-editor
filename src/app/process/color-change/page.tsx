import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import ColorChangeClient from './client';

export default function ColorChangePage() {
  return (
    <SuspenseWrapper>
      <ColorChangeClient />
    </SuspenseWrapper>
  );
}
