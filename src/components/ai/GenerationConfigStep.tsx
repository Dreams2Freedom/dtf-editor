'use client';

import React, { useRef, useEffect, useState } from 'react';
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
  Eye,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { GenerationOptions, GeneratedImage } from './PromptWizard';

interface PreviewData {
  previewId: string;
  watermarkedUrl: string;
  expiresIn: number;
}

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

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewIds, setPreviewIds] = useState<string[]>([]);

  // Scroll to results when generation starts
  useEffect(() => {
    if (isGenerating && resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [isGenerating]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      if (previewIds.length > 0) {
        // Cleanup all previews when component unmounts
        fetch('/api/generate/preview/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ previewIds }),
        }).catch(err => console.error('Preview cleanup error:', err));
      }
    };
  }, [previewIds]);

  // Calculate credit cost
  // Always using 'high' quality for best transparent backgrounds = 2 credits per image
  // Note: gpt-image-1 only generates one image per call
  const creditCost = 2;
  const totalCost = creditCost;

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

  // Generate FREE preview (low-quality watermarked)
  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true);
    setPreviewData(null);

    try {
      const response = await fetch('/api/generate/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: finalPrompt,
          size: generationOptions.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a few minutes and try again.');
        } else {
          toast.error(data.error || 'Failed to generate preview');
        }
        return;
      }

      setPreviewData({
        previewId: data.previewId,
        watermarkedUrl: data.watermarkedUrl,
        expiresIn: data.expiresIn,
      });
      setPreviewIds(prev => [...prev, data.previewId]);
      toast.success('FREE preview generated! No credits charged.');

      // Scroll to preview
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Preview generation error:', error);
      toast.error('Failed to generate preview. Please try again.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download print-ready image (upscales preview and charges credits)
  const handleDownloadPrintReady = async () => {
    if (!previewData) return;

    const size = generationOptions.size;
    const isLargeSize = size === '1792x1024' || size === '1024x1792';
    const creditsRequired = isLargeSize ? 2 : 1;

    if (!isAdmin && (profile?.credits_remaining || 0) < creditsRequired) {
      toast.error(
        `You need ${creditsRequired} credits but only have ${profile?.credits_remaining || 0}`
      );
      return;
    }

    onGeneratingChange(true);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          previewId: previewData.previewId,
          size: generationOptions.size,
          quality: 'high',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to generate print-ready image');
        return;
      }

      onImagesGenerated(data.images || []);
      toast.success(
        `Print-ready image generated! ${data.creditsUsed} credits used. Preview cleaned up.`
      );

      // Clear preview after successful download
      setPreviewData(null);

      // Refresh profile
      try {
        await useAuthStore.getState().refreshProfile();
      } catch (refreshError) {
        console.error('Failed to refresh profile:', refreshError);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to generate print-ready image. Please try again.');
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

          {/* Preview-Then-Purchase Options */}
          <div className="mt-4 space-y-3">
            {/* FREE Preview Button */}
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="lg"
                className="w-full border-2 border-green-500 bg-green-50 hover:bg-green-100 text-green-700 font-semibold"
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview || isGenerating}
              >
                {isGeneratingPreview ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 mr-2" />
                    Generate Preview (FREE - No Credits)
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-600 text-center">
                🎉 Try unlimited low-quality watermarked previews for free before purchasing!
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            {/* Full Quality Generate Button */}
            <Button
              variant="default"
              size="lg"
              className="w-full"
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
                  Generate Full Quality ({totalCost} credits)
                </>
              )}
            </Button>

            {!hasEnoughCredits && !isAdmin && (
              <p className="text-xs text-error-600 mt-2 text-center">
                Insufficient credits. You have {profile?.credits_remaining || 0}{' '}
                but need {totalCost}.
              </p>
            )}
          </div>

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
          <h3 className="font-semibold mb-4">
            {previewData ? 'Preview Image' : 'Generated Images'}
          </h3>

          {/* Preview Display */}
          {previewData && !generatedImages.length && (
            <div className="space-y-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-green-400">
                <Image
                  src={previewData.watermarkedUrl}
                  alt="Preview image"
                  fill
                  className="object-contain"
                />
                {/* Watermark Badge Overlay */}
                <div className="absolute top-2 right-2">
                  <div className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    PREVIEW
                  </div>
                </div>
              </div>

              {/* Preview Info Card */}
              <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-1">
                        FREE Preview Generated!
                      </h4>
                      <p className="text-xs text-green-700">
                        This is a low-quality watermarked preview. Like what you see?
                        Download the high-quality print-ready version below.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-green-600 mb-3">
                      ⏱️ Preview expires in {Math.floor(previewData.expiresIn / 60)} minutes
                    </p>

                    {/* Download Print-Ready Button */}
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      onClick={handleDownloadPrintReady}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Upscaling to Print Quality...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          Download Print-Ready ({generationOptions.size === '1024x1024' ? '1' : '2'} credits)
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      4x upscaled, no watermark, maintains transparency
                    </p>
                  </div>
                </div>
              </Card>

              {/* Generate New Preview Button */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                Generate New Preview (Still FREE!)
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!previewData && generatedImages.length === 0 && !isGenerating && !isGeneratingPreview && (
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

          {/* Loading States */}
          {isGeneratingPreview && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
              <p className="text-gray-700 font-medium">
                Generating FREE preview...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                No credits will be charged
              </p>
              <div className="mt-4 text-xs text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                <TransparentBackgroundInline />
              </div>
            </div>
          )}

          {isGenerating && !previewData && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-700 font-medium">
                Creating your image...
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
