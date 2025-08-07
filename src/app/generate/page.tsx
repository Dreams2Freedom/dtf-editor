import { Metadata } from 'next';
import { ImageGenerator } from '@/components/ai/ImageGenerator';

export const metadata: Metadata = {
  title: 'AI Image Generator - DTF Editor',
  description: 'Generate unique images for DTF printing using AI. Create custom designs with natural language prompts.',
};

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <ImageGenerator />
      </div>
    </div>
  );
}