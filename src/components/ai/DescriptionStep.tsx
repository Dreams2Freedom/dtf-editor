'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransparentBackgroundNotice } from './TransparentBackgroundBadge';
import {
  Sparkles,
  PlayCircle,
  ChevronDown,
  ChevronUp,
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
  // Input mode props - Guided Mode (conversational) or Upload Image
  inputMode: 'upload' | 'guided';
  onInputModeChange: (mode: 'upload' | 'guided') => void;
  onImageAnalysisComplete?: (prompt: string) => void;
  isFromImageAnalysis: boolean;
  onConversationalComplete?: (prompt: string) => Promise<void>;
}

/**
 * Step 1: User chooses input method - Guided Mode (conversational AI) or Upload Image
 * Guided Mode provides a chat-based interface to build the perfect prompt
 * Upload Image analyzes an existing image to create or modify designs
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
        <div className="grid grid-cols-2 gap-1">
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
                {inputMode === 'guided'
                  ? 'Chat with AI to build the perfect prompt'
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
            {inputMode === 'guided' ? (
              <>
                {/* Guided Mode Flow (3 steps) */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">
                      Describe Your Idea
                    </h4>
                    <p className="text-sm text-blue-700">
                      Start with a basic concept or idea. Just tell the AI what
                      you're thinking - it doesn't need to be detailed yet!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900">
                      Answer Questions
                    </h4>
                    <p className="text-sm text-purple-700">
                      The AI asks 3-5 follow-up questions about style, colors,
                      mood, and details. Quick reply buttons make it fast!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">
                      Generate Image
                    </h4>
                    <p className="text-sm text-green-700">
                      Your answers automatically create an optimized prompt, and
                      the image generates with a transparent background!
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Upload Image Mode Flow (2 steps) */}
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

      {/* Conditional Content - Guided Mode or Image Upload */}
      {inputMode === 'guided' && (
        <>
          {/* Conversational Prompt Builder */}
          <ConversationalPromptBuilder
            onComplete={(prompt: string) => {
              if (onConversationalComplete) {
                onConversationalComplete(prompt);
              }
            }}
            onCancel={() => onInputModeChange('upload')}
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
