import { Suspense } from 'react';
import ClippingMagicEditorClient from './client';

export default function ClippingMagicEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <ClippingMagicEditorClient />
    </Suspense>
  );
}
