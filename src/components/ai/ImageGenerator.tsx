'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PromptBuilder } from './PromptBuilder';
import { ImageToImageDirect } from './ImageToImageDirect';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import {
  Download,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Type,
  Upload,
  Scissors,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GenerationOptions {
  size: '1024x1024' | '1024x1536' | '1536x1024';
  quality: 'low' | 'standard' | 'high';
  style: 'vivid' | 'natural';
  count: number;
}

interface GeneratedImage {
  url: string;
  id?: string;
  revised_prompt?: string;
}

export function ImageGenerator() {
  const { user, profile } = useAuthStore();
  const router = useRouter();
  const [mode, setMode] = useState<'text-to-image' | 'image-to-image'>(
    'text-to-image'
  );
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<GenerationOptions>({
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    count: 1,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  // Always enhance for DTF - transparent backgrounds are critical
  const enhanceForDTF = true;

  // Check if user has access (admins always have access)
  const isAdmin = profile?.is_admin === true;
  const isPaidUser =
    profile?.subscription_tier && profile.subscription_tier !== 'free';
  const hasCredits = (profile?.credits_remaining || 0) > 0;

  // Calculate credit cost based on quality for GPT-Image-1 (Beta)
  const qualityCredits = {
    low: 1,
    standard: 1,
    high: 2,
  };
  const creditCost = qualityCredits[options.quality] || 2;
  const totalCost = creditCost * options.count;
  const canGenerate =
    isAdmin ||
    (isPaidUser && hasCredits && (profile?.credits_remaining || 0) >= totalCost);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!canGenerate) {
      if (!isPaidUser && !isAdmin) {
        toast.error(
          'AI image generation is only available for paid subscribers'
        );
      } else if (!isAdmin) {
        toast.error(
          `You need ${totalCost} credits but only have ${profile?.credits_remaining || 0}`
        );
      }
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          prompt,
          size: options.size,
          quality: options.quality,
          style: options.style,
          count: options.count,
          enhanceForDTF,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresUpgrade) {
          toast.error(
            'Please upgrade to a paid plan to use AI image generation'
          );
        } else {
          toast.error(data.error || 'Failed to generate image');
        }
        return;
      }

      setGeneratedImages(data.images || []);
      toast.success(
        `Generated ${data.images.length} image${data.images.length > 1 ? 's' : ''}! ${totalCost} credits used.`
      );

      // Refresh user profile to update credits
      await useAuthStore.getState().refreshProfile();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  };

  if (!isPaidUser && !isAdmin) {
    return (
      <Card className="p-8 text-center">
        <div className="mb-4">
          <Sparkles className="w-16 h-16 mx-auto text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          AI Image Generation{' '}
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
            Beta
          </span>
        </h2>
        <p className="text-gray-600 mb-6">
          Create unique images with AI using natural language prompts. This
          feature is exclusively available for paid subscribers.
        </p>
        <Link href="/pricing">
          <Button variant="primary" size="lg">
            Upgrade to Unlock AI Generation
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
            Create unique images using GPT-Image-1
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Credits Available</div>
          <div className="text-2xl font-bold text-purple-600">
            {profile?.credits_remaining || 0}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Mode Toggle */}
          <Card className="p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('text-to-image')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'text-to-image'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Type className="w-4 h-4" />
                Text to Image
              </button>
              <button
                onClick={() => setMode('image-to-image')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'image-to-image'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Image to Image
              </button>
            </div>
          </Card>

          {/* Prompt Builder or Image Upload */}
          <Card className="p-6">
            {mode === 'text-to-image' ? (
              <PromptBuilder
                onPromptChange={setPrompt}
                initialPrompt={prompt}
              />
            ) : (
              <ImageToImageDirect
                onImagesGenerated={images => {
                  setGeneratedImages(images);
                  // Clear any prompt since we're using direct generation
                  setPrompt('');
                }}
                generationOptions={options}
              />
            )}
          </Card>

          {/* Generation Options */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Generation Options</h3>

            {/* Size Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Image Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setOptions({ ...options, size: '1024x1024' })}
                  className={`p-2 rounded-lg border text-sm ${
                    options.size === '1024x1024'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Square
                  <br />
                  1024×1024
                </button>
                <button
                  onClick={() => setOptions({ ...options, size: '1024x1536' })}
                  className={`p-2 rounded-lg border text-sm ${
                    options.size === '1024x1536'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Portrait
                  <br />
                  1024×1536
                </button>
                <button
                  onClick={() => setOptions({ ...options, size: '1536x1024' })}
                  className={`p-2 rounded-lg border text-sm ${
                    options.size === '1536x1024'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Landscape
                  <br />
                  1536×1024
                </button>
              </div>
            </div>

            {/* Quality Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setOptions({ ...options, quality: 'low' })}
                  className={`p-3 rounded-lg border ${
                    options.quality === 'low'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Low</div>
                  <div className="text-xs text-gray-600">1 credit</div>
                </button>
                <button
                  onClick={() =>
                    setOptions({ ...options, quality: 'standard' })
                  }
                  className={`p-3 rounded-lg border ${
                    options.quality === 'standard'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Standard</div>
                  <div className="text-xs text-gray-600">2 credits</div>
                </button>
                <button
                  onClick={() => setOptions({ ...options, quality: 'high' })}
                  className={`p-3 rounded-lg border ${
                    options.quality === 'high'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">High</div>
                  <div className="text-xs text-gray-600">3 credits</div>
                </button>
              </div>
            </div>

            {/* Style Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Style</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOptions({ ...options, style: 'vivid' })}
                  className={`p-3 rounded-lg border ${
                    options.style === 'vivid'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Vivid</div>
                  <div className="text-xs text-gray-600">More creative</div>
                </button>
                <button
                  onClick={() => setOptions({ ...options, style: 'natural' })}
                  className={`p-3 rounded-lg border ${
                    options.style === 'natural'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Natural</div>
                  <div className="text-xs text-gray-600">More realistic</div>
                </button>
              </div>
            </div>

            {/* Count Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Number of Images
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={options.count}
                  onChange={e =>
                    setOptions({ ...options, count: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="w-8 text-center font-medium">
                  {options.count}
                </span>
              </div>
            </div>

            {/* DTF Enhancement Notice */}
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✓</span>
                <span className="text-sm text-purple-700 font-medium">
                  DTF Optimization Active
                </span>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Transparent background & print-ready formatting enabled
              </p>
            </div>

            {/* Cost Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>Total Cost:</span>
                <span className="font-semibold">{totalCost} credits</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Credits After:</span>
                <span
                  className={`font-semibold ${(profile?.credits_remaining || 0) - totalCost < 0 ? 'text-red-600' : ''}`}
                >
                  {(profile?.credits_remaining || 0) - totalCost}
                </span>
              </div>
            </div>

            {/* Generate Button - Only show in Text to Image mode */}
            {mode === 'text-to-image' && (
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-4"
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating || !prompt}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Image{options.count > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </Card>
        </div>

        {/* Right Column - Results */}
        <div>
          <Card className="p-6 min-h-[400px]">
            <h3 className="font-semibold mb-4">Generated Images</h3>

            {generatedImages.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ImageIcon className="w-16 h-16 mb-4" />
                <p className="text-center">
                  Your generated images will appear here
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">
                  Creating your image{options.count > 1 ? 's' : ''}...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This may take up to 30 seconds
                </p>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="grid gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="space-y-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={image.url}
                        alt={`Generated image ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                    {image.revised_prompt && (
                      <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                        <strong>Enhanced prompt:</strong> {image.revised_prompt}
                      </div>
                    )}
                    <div className="flex gap-2">
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
                          // Prefer using image ID for navigation (much shorter URL)
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
                      <Link
                        href={`/process?image=${encodeURIComponent(image.url)}`}
                      >
                        <Button variant="primary" size="sm">
                          Process
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
