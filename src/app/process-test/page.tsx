import { Suspense } from 'react';
import ProcessTestClient from './client';

export default function ProcessTestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ProcessTestClient />
    </Suspense>
  );
}