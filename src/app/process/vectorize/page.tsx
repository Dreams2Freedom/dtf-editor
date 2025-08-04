import { SuspenseWrapper } from '@/components/SuspenseWrapper';
import VectorizeClient from './client';

export default function VectorizePage() {
  return (
    <SuspenseWrapper>
      <VectorizeClient />
    </SuspenseWrapper>
  );
}
