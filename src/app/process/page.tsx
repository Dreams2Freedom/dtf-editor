import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import ProcessClient from './client';

export default function ProcessPage() {
  return (
    <SuspenseWrapper>
      <ProcessClient />
    </SuspenseWrapper>
  );
}
