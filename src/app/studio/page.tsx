import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import StudioClient from './client';

export const metadata = {
  title: 'Studio | DTF Editor',
  description: 'Edit your image with AI-powered tools',
};

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <StudioClient />
    </Suspense>
  );
}
