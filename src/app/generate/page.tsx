import { Metadata } from 'next';
import { PromptWizard } from '@/components/ai/PromptWizard';

export const metadata: Metadata = {
  title: 'AI Image Generator - DTF Editor',
  description:
    'Generate unique images for DTF printing using AI-powered prompt optimization. All images automatically include transparent backgrounds.',
};

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PromptWizard />
      </div>
    </div>
  );
}
