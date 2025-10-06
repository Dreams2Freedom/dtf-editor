'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// Wizard step components (to be created)
import { DescriptionStep } from './DescriptionStep';
import { PromptOptimizationStep } from './PromptOptimizationStep';
import { GenerationConfigStep } from './GenerationConfigStep';

// Types
export interface GenerationOptions {
  size: '1024x1024' | '1024x1792' | '1792x1024';
  quality: 'low' | 'medium' | 'high' | 'auto';
  style?: 'vivid' | 'natural'; // Not supported by gpt-image-1, but kept for compatibility
  count: number;
}

export interface OptimizedPrompt {
  text: string;
  focus: string;
}

export interface GeneratedImage {
  url: string;
  id?: string;
  revised_prompt?: string;
}

type WizardMode = 'text-to-image' | 'image-to-image';
type WizardStep = 1 | 2 | 3;

const STORAGE_KEY = 'ai_wizard_progress';

/**
 * Main wizard container for AI image generation
 * Manages 3-step flow with progress persistence
 */
export function PromptWizard() {
  const { profile } = useAuthStore();

  // Wizard state
  const [mode, setMode] = useState<WizardMode>('text-to-image');
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: User description
  const [userDescription, setUserDescription] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'upload'>('text');
  const [isFromImageAnalysis, setIsFromImageAnalysis] = useState(false);

  // Step 2: Optimized prompts
  const [optimizedPrompts, setOptimizedPrompts] = useState<OptimizedPrompt[]>(
    []
  );
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(-1); // -1 = original description (default)
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Step 3: Generation options & results
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>(
    {
      size: '1024x1024',
      quality: 'high', // Always use high quality for best transparent backgrounds
      count: 1,
    }
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Load saved progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.userDescription) setUserDescription(data.userDescription);
        if (data.generationOptions)
          setGenerationOptions(data.generationOptions);
      } catch (error) {
        console.error('Failed to load saved wizard progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    const data = {
      userDescription,
      generationOptions,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [userDescription, generationOptions]);

  // Clear saved progress
  const clearProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserDescription('');
    setOptimizedPrompts([]);
    setSelectedPromptIndex(0);
    setEditedPrompt('');
    setGeneratedImages([]);
    setCurrentStep(1);
  };

  // Get final prompt to use for generation
  const getFinalPrompt = (): string => {
    if (editedPrompt) return editedPrompt;
    if (optimizedPrompts.length > 0 && selectedPromptIndex >= 0) {
      return optimizedPrompts[selectedPromptIndex]?.text || '';
    }
    return userDescription;
  };

  // Step navigation
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return userDescription.trim().length > 0;
      case 2:
        return getFinalPrompt().trim().length > 0;
      case 3:
        return false; // No next from final step
      default:
        return false;
    }
  };

  // Generate optimized prompts from a description
  const generateOptimizedPrompts = async (description: string) => {
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/generate/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          count: 4,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize prompts');
      }

      const data = await response.json();
      setOptimizedPrompts(data.prompts || []);
      setSelectedPromptIndex(-1); // Default to original description
      setEditedPrompt('');
      return true;
    } catch (error) {
      console.error('Error optimizing prompts:', error);
      // Fallback: use original description
      setOptimizedPrompts([
        {
          text: description,
          focus: 'Original description',
        },
      ]);
      return false;
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleNext = async () => {
    if (!canGoNext()) return;

    if (currentStep === 1) {
      // Check if prompt is from image analysis
      if (isFromImageAnalysis) {
        // Skip Step 2 - prompt is already AI-optimized from GPT-4o Vision
        setCurrentStep(3); // Go directly to generation config
        setIsFromImageAnalysis(false); // Reset flag
      } else {
        // Normal flow - generate optimized prompts
        await generateOptimizedPrompts(userDescription);
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  // Re-generate prompts from edited text
  const handleRegenerateFromEdit = async (editedText: string) => {
    await generateOptimizedPrompts(editedText);
  };

  // Handle image analysis completion
  const handleImageAnalysisComplete = (generatedPrompt: string) => {
    setUserDescription(generatedPrompt);
    setInputMode('text'); // Auto-switch to text mode
    setIsFromImageAnalysis(true); // Mark as AI-generated from image analysis
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  // Handler for going back to prompts step to regenerate
  const handleGoBackToPrompts = () => {
    setCurrentStep(2);
    setGeneratedImages([]); // Clear previous images
  };

  // Step indicator
  const steps = [
    { number: 1, title: 'Describe', icon: Sparkles },
    { number: 2, title: 'Optimize', icon: CheckCircle },
    { number: 3, title: 'Generate', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Header with credits */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Image Generator
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
              Beta
            </span>
          </h2>
          <p className="text-gray-600 mt-1">
            Create unique images with AI-powered prompt optimization
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Credits Available</div>
          <div className="text-2xl font-bold text-purple-600">
            {profile?.credits_remaining || 0}
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <Card className="p-6">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Steps */}
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.number === currentStep;
            const isComplete = step.number < currentStep;

            return (
              <div
                key={step.number}
                className="flex-1 flex flex-col items-center relative"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                      : isComplete
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600'}`}
                  >
                    Step {step.number}
                  </div>
                  <div className="text-xs text-gray-500">{step.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Navigation - Only shown for Step 2 (Step 1 has its own button now) */}
      {currentStep === 2 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border-2 border-primary-200 shadow-sm">
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Description
          </Button>

          <Button
            variant="default"
            size="lg"
            onClick={handleNext}
            disabled={!canGoNext()}
            className="shadow-lg"
          >
            Next: Generate Images
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <DescriptionStep
            description={userDescription}
            onDescriptionChange={setUserDescription}
            onGenerateClick={handleNext}
            isGenerating={isOptimizing}
            canGenerate={canGoNext()}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            onImageAnalysisComplete={handleImageAnalysisComplete}
            isFromImageAnalysis={isFromImageAnalysis}
          />
        )}

        {currentStep === 2 && (
          <PromptOptimizationStep
            optimizedPrompts={optimizedPrompts}
            selectedIndex={selectedPromptIndex}
            onSelectPrompt={setSelectedPromptIndex}
            editedPrompt={editedPrompt}
            onEditPrompt={setEditedPrompt}
            originalDescription={userDescription}
            isOptimizing={isOptimizing}
            onRegenerateFromEdit={handleRegenerateFromEdit}
          />
        )}

        {currentStep === 3 && (
          <GenerationConfigStep
            finalPrompt={getFinalPrompt()}
            generationOptions={generationOptions}
            onOptionsChange={setGenerationOptions}
            generatedImages={generatedImages}
            onImagesGenerated={setGeneratedImages}
            isGenerating={isGenerating}
            onGeneratingChange={setIsGenerating}
            onGoBackToPrompts={handleGoBackToPrompts}
          />
        )}
      </div>
    </div>
  );
}
