import { Suspense } from 'react';
import TestCMEditorClient from './client';

export default function TestCMEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <TestCMEditorClient />
    </Suspense>
  );
}
