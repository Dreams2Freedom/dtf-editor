'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { TransparentBackgroundNotice } from './TransparentBackgroundBadge';
import { Lightbulb, Sparkles } from 'lucide-react';

interface DescriptionStepProps {
  description: string;
  onDescriptionChange: (description: string) => void;
}

const examplePrompts = [
  'A majestic lion wearing a golden crown',
  'Vintage rose with watercolor effect',
  'Retro 80s neon geometric pattern',
  'Cute cartoon cat wearing sunglasses',
  'Motivational quote "Never Give Up" in bold typography',
  'Tribal dragon design with intricate details',
];

/**
 * Step 1: User describes what image they want to create
 * Includes transparent background notice and helpful examples
 */
export function DescriptionStep({
  description,
  onDescriptionChange,
}: DescriptionStepProps) {
  return (
    <div className="space-y-4">
      {/* Main input card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="description"
              className="block text-lg font-semibold mb-2"
            >
              What image do you want to create?
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Describe your vision in detail. Our AI will optimize your
              description for the best results.
            </p>
          </div>

          <div className="relative">
            <textarea
              id="description"
              value={description}
              onChange={e => onDescriptionChange(e.target.value)}
              placeholder="Example: A fierce tiger with vibrant orange and black stripes, roaring powerfully..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              rows={6}
              maxLength={4000}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 rounded">
              {description.length}/4000
            </div>
          </div>
        </div>
      </Card>

      {/* Transparent Background Notice */}
      <TransparentBackgroundNotice />

      {/* Tips & Examples */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Tips for Better Results
            </h4>
            <ul className="text-xs text-blue-700 space-y-1.5">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Be specific about colors, style, and details</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Mention the artistic style (realistic, cartoon, vintage, etc.)
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>Focus on the subject</strong> - backgrounds are
                  automatically removed
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Use descriptive adjectives (vibrant, bold, elegant, fierce,
                  etc.)
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  For text/quotes, specify font style and layout preferences
                </span>
              </li>
            </ul>
          </div>

          {/* Example Prompts */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Example Prompts to Inspire You
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => onDescriptionChange(example)}
                  className="text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary-300 transition-all text-sm text-gray-700 hover:text-primary-700"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* What Happens Next */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">
              Next: AI Prompt Optimization
            </h4>
            <p className="text-sm text-purple-700">
              Our AI will generate 3-4 optimized variations of your description,
              each focusing on different aspects like style, color, or
              composition. You'll choose the one that best matches your vision!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
