'use client';

import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TransparentBackgroundBadge,
  TransparentBackgroundInline,
} from './TransparentBackgroundBadge';
import {
  Sparkles,
  Loader2,
  Download,
  Scissors,
  Image as ImageIcon,
  Edit3,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { GenerationOptions, GeneratedImage } from './PromptWizard';

interface GenerationConfigStepProps {
  finalPrompt: string;
  generationOptions: GenerationOptions;
  onOptionsChange: (options: GenerationOptions) => void;
  generatedImages: GeneratedImage[];
  onImagesGenerated: (images: GeneratedImage[]) => void;
  isGenerating: boolean;
  onGeneratingChange: (generating: boolean) => void;
  onGoBackToPrompts?: () => void;
}

/**
 * Step 3: Configure generation options and generate images
 * Displays results and post-processing options
 */
export function GenerationConfigStep({
  finalPrompt,
  generationOptions,
  onOptionsChange,
  generatedImages,
  onImagesGenerated,
  isGenerating,
  onGeneratingChange,
  onGoBackToPrompts,
}: GenerationConfigStepProps) {
  const { profile } = useAuthStore();
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to results when generation starts
  useEffect(() => {
    if (isGenerating && resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [isGenerating]);

  // Calculate credit cost
  // Always using 'high' quality for best transparent backgrounds = 2 credits per image
  const creditCost = 2;
  const totalCost = creditCost * generationOptions.count;

  // Use Boolean() to safely handle any truthy value (true, 1, 'true', etc.)
  const isAdmin = Boolean(profile?.is_admin);
  const hasEnoughCredits =
    isAdmin || (profile?.credits_remaining || 0) >= totalCost;

  const handleGenerate = async () => {
    if (!hasEnoughCredits && !isAdmin) {
      toast.error(
        `You need ${totalCost} credits but only have ${profile?.credits_remaining || 0}`
      );
      return;
    }

    onGeneratingChange(true);
    onImagesGenerated([]);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: finalPrompt,
          size: generationOptions.size,
          quality: 'high', // Always use high quality for best transparent backgrounds
          count: generationOptions.count,
          enhanceForDTF: true, // Always enhance for DTF
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to generate image');
        return;
      }

      onImagesGenerated(data.images || []);
      toast.success(
        `Generated ${data.images.length} image${data.images.length > 1 ? 's' : ''}! ${data.creditsUsed} credits used.`
      );

      // Clear wizard progress from localStorage after successful generation
      try {
        localStorage.removeItem('ai_wizard_progress');
      } catch (storageError) {
        console.error('Failed to clear wizard progress:', storageError);
      }

      // Refresh profile to update credits with error handling
      try {
        await useAuthStore.getState().refreshProfile();
      } catch (refreshError) {
        console.error('Failed to refresh profile:', refreshError);
        toast.warning(
          'Generation succeeded but credit display may be outdated. Refresh page to see updated balance.'
        );
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      onGeneratingChange(false);
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    let objectUrl: string | null = null;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      objectUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `ai-generated-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    } finally {
      // Always revoke the object URL to prevent memory leaks
      if (objectUrl) {
        // Small delay to ensure download started
        setTimeout(() => window.URL.revokeObjectURL(objectUrl!), 100);
      }
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left Column - Configuration */}
      <div className="space-y-4">
        {/* Selected Prompt Display */}
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-sm font-semibold text-purple-900">
              Your Prompt
            </h4>
            <TransparentBackgroundBadge size="sm" />
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{finalPrompt}</p>
        </Card>

        {/* Generation Options */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Generation Options</h3>

          {/* Size Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Image Size</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, size: '1024x1024' })
                }
                className={`p-2 rounded-lg border text-sm transition-all ${
                  generationOptions.size === '1024x1024'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Square
                <br />
                1024×1024
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, size: '1024x1792' })
                }
                className={`p-2 rounded-lg border text-sm transition-all ${
                  generationOptions.size === '1024x1792'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Portrait
                <br />
                1024×1792
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, size: '1792x1024' })
                }
                className={`p-2 rounded-lg border text-sm transition-all ${
                  generationOptions.size === '1792x1024'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Landscape
                <br />
                1792×1024
              </button>
            </div>
          </div>

          {/* Quality Selection - Hidden (always set to "high" for best transparent backgrounds) */}
          {/* Style Selection - Disabled (not supported by gpt-image-1) */}
          {/* <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Style</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, style: 'vivid' })
                }
                className={`p-3 rounded-lg border text-sm transition-all ${
                  generationOptions.style === 'vivid'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">Vivid</div>
                <div className="text-xs text-gray-600">More creative</div>
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, style: 'natural' })
                }
                className={`p-3 rounded-lg border text-sm transition-all ${
                  generationOptions.style === 'natural'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">Natural</div>
                <div className="text-xs text-gray-600">More realistic</div>
              </button>
            </div>
          </div> */}

          {/* Count Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Number of Images
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, count: 1 })
                }
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  generationOptions.count === 1
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                1
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, count: 2 })
                }
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  generationOptions.count === 2
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                2
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, count: 3 })
                }
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  generationOptions.count === 3
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                3
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...generationOptions, count: 4 })
                }
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  generationOptions.count === 4
                    ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                4
              </button>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-semibold text-gray-900">
                {totalCost} credits
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Credits After:</span>
              <span
                className={`font-semibold ${(profile?.credits_remaining || 0) - totalCost < 0 ? 'text-error-600' : 'text-success-600'}`}
              >
                {(profile?.credits_remaining || 0) - totalCost}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <TransparentBackgroundInline className="text-gray-700" />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            variant="default"
            size="lg"
            className="w-full mt-4"
            onClick={handleGenerate}
            disabled={!hasEnoughCredits || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Image{generationOptions.count > 1 ? 's' : ''}
              </>
            )}
          </Button>

          {!hasEnoughCredits && !isAdmin && (
            <p className="text-xs text-error-600 mt-2 text-center">
              Insufficient credits. You have {profile?.credits_remaining || 0}{' '}
              but need {totalCost}.
            </p>
          )}

          {/* Loading time notice */}
          {isGenerating && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 text-center">
                ⏱️ High-quality transparent images take 1-2 minutes to generate.
                Please wait...
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Right Column - Results */}
      <div ref={resultsRef}>
        <Card className="p-6 min-h-[500px]">
          <h3 className="font-semibold mb-4">Generated Images</h3>

          {generatedImages.length === 0 && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-center text-sm">
                Your generated images will appear here
              </p>
              <p className="text-xs text-center mt-2 max-w-xs">
                All images automatically include transparent backgrounds
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-700 font-medium">
                Creating your image{generationOptions.count > 1 ? 's' : ''}...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This may take up to 30 seconds
              </p>
              <div className="mt-4 text-xs text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                <TransparentBackgroundInline />
              </div>
            </div>
          )}

          {generatedImages.length > 0 && (
            <div className="space-y-4">
              {generatedImages.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                    <Image
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadImage(image.url, index)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (image.id) {
                          router.push(
                            `/process/background-removal?imageId=${image.id}`
                          );
                        } else {
                          router.push(
                            `/process/background-removal?imageUrl=${encodeURIComponent(image.url)}`
                          );
                        }
                      }}
                    >
                      <Scissors className="w-4 h-4 mr-1" />
                      Remove BG
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        router.push(
                          `/process?image=${encodeURIComponent(image.url)}`
                        );
                      }}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Process
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <TransparentBackgroundInline />
                  </div>
                </div>
              ))}

              {/* Regenerate Prompts Button */}
              {onGoBackToPrompts && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={onGoBackToPrompts}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Not Happy? Regenerate Prompts
                  </Button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Go back to Step 2 to choose different prompt variations
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
