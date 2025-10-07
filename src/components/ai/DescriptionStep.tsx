'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransparentBackgroundNotice } from './TransparentBackgroundBadge';
import {
  Lightbulb,
  Sparkles,
  ArrowRight,
  Loader2,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Upload,
} from 'lucide-react';
import { ImageToImageUpload } from './ImageToImageUpload';
import { ConversationalPromptBuilder } from './ConversationalPromptBuilder';
import { MessageCircle } from 'lucide-react';

interface DescriptionStepProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  onGenerateClick: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  // NEW: Input mode props
  inputMode: 'text' | 'upload' | 'guided';
  onInputModeChange: (mode: 'text' | 'upload' | 'guided') => void;
  onImageAnalysisComplete?: (prompt: string) => void;
  isFromImageAnalysis: boolean;
  onConversationalComplete?: (prompt: string) => void;
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
  onGenerateClick,
  isGenerating,
  canGenerate,
  inputMode,
  onInputModeChange,
  onImageAnalysisComplete,
  isFromImageAnalysis,
  onConversationalComplete,
}: DescriptionStepProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="space-y-4">
      {/* Mode Selector - Segmented Control */}
      <Card className="p-1 bg-gray-100">
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onInputModeChange('text')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all ${
              inputMode === 'text'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Simple Mode</span>
            <span className="sm:hidden">Simple</span>
          </button>
          <button
            onClick={() => onInputModeChange('guided')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all relative ${
              inputMode === 'guided'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guided Mode</span>
            <span className="sm:hidden">Guided</span>
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              NEW
            </span>
          </button>
          <button
            onClick={() => onInputModeChange('upload')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all ${
              inputMode === 'upload'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Image</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </Card>

      {/* How It Works Section */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">How It Works</h3>
              <p className="text-sm text-blue-700">
                {inputMode === 'text'
                  ? '3 simple steps to create your perfect DTF design'
                  : '2 simple steps to recreate or modify any design'}
              </p>
            </div>
          </div>
          {showHowItWorks ? (
            <ChevronUp className="w-5 h-5 text-blue-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {showHowItWorks && (
          <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
            {inputMode === 'text' ? (
              <>
                {/* Text-to-Image Flow (3 steps) */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">
                      Describe Your Image
                    </h4>
                    <p className="text-sm text-blue-700">
                      Enter a simple description of what you want. Don't worry
                      about being too detailed - our AI will enhance it!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900">
                      Choose AI-Optimized Prompt
                    </h4>
                    <p className="text-sm text-purple-700">
                      Our AI generates 4 professional variations with rich
                      details, colors, and styles. Pick your favorite or edit!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">
                      Generate & Download
                    </h4>
                    <p className="text-sm text-green-700">
                      Configure size and quality, then generate your image with
                      a transparent background!
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Image-to-Text Flow (2 steps) */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">
                      Upload & Analyze
                    </h4>
                    <p className="text-sm text-blue-700">
                      Upload your image and optionally describe what changes you
                      want (e.g., "Change MOM to GRANDMA"). Our AI will analyze
                      it and create a detailed prompt.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">
                      Configure & Generate
                    </h4>
                    <p className="text-sm text-green-700">
                      Review the AI-generated prompt (you can edit it),
                      configure size and quality, then generate your new image!
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="mt-4 pt-3 border-t border-blue-200">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-700 hover:text-blue-900"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Watch Video Tutorial (Coming Soon)
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Conditional Content - Text Input, Guided Mode, or Image Upload */}
      {inputMode === 'text' && (
        <>
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

              {/* Generate Button - Directly Below Textarea */}
              <div className="pt-2">
                <Button
                  variant="default"
                  size="lg"
                  onClick={onGenerateClick}
                  disabled={!canGenerate || isGenerating}
                  className="w-full shadow-lg text-base font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Optimized Prompts...
                    </>
                  ) : isFromImageAnalysis ? (
                    <>
                      Next: Configure Image
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Prompts
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                {!canGenerate && description.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Enter a description above to continue
                  </p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {inputMode === 'guided' && (
        <>
          {/* Conversational Prompt Builder */}
          <ConversationalPromptBuilder
            onComplete={(prompt: string) => {
              if (onConversationalComplete) {
                onConversationalComplete(prompt);
              }
            }}
            onCancel={() => onInputModeChange('text')}
            initialMessage={description}
          />
        </>
      )}

      {inputMode === 'upload' && (
        <>
          {/* Image Upload Mode */}
          <Card className="p-6">
            <ImageToImageUpload
              onAnalysisComplete={prompt => {
                // Let the parent handle all state updates in the correct order
                if (onImageAnalysisComplete) {
                  onImageAnalysisComplete(prompt);
                }
              }}
              isDisabled={isGenerating}
            />
          </Card>
        </>
      )}

      {/* Transparent Background Notice */}
      <TransparentBackgroundNotice />

      {/* Tips & Examples - Only show in text mode */}
      {inputMode === 'text' && (
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
                    Mention the artistic style (realistic, cartoon, vintage,
                    etc.)
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
      )}

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
