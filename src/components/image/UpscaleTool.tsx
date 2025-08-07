'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ProcessingMode } from '@/services/deepImage';
import { useRouter } from 'next/navigation';
import { Scissors } from 'lucide-react';

interface UpscaleToolProps {
  imageFile: File;
  imagePreview: string; // For display purposes
  onUpscaleComplete?: (upscaledUrl: string) => void;
}

export const UpscaleTool: React.FC<UpscaleToolProps> = ({ imageFile, imagePreview, onUpscaleComplete }) => {
  const router = useRouter();
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('auto_enhance');
  const [scale, setScale] = useState<2 | 4>(4);

  const processingModeOptions = [
    {
      value: 'auto_enhance' as ProcessingMode,
      label: 'Auto Enhance',
      description: 'Denoise, deblur, and enhance lighting automatically'
    },
    {
      value: 'generative_upscale' as ProcessingMode,
      label: 'Generative Upscale',
      description: 'AI-powered upscaling with enhanced detail generation'
    },
    {
      value: 'basic_upscale' as ProcessingMode,
      label: 'Basic Upscale',
      description: 'Simple resolution increase without additional enhancements'
    }
  ];

  const scaleOptions = [
    { value: 2, label: '2x Scale' },
    { value: 4, label: '4x Scale' }
  ];

  const handleUpscale = async () => {
    if (!imageFile) {
      setError('No image file provided');
      return;
    }

    setIsUpscaling(true);
    setProgress(0);
    setError(null);
    setUpscaledUrl(null);

    // Create a progress interval with different speeds based on processing mode
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Slow down progress for generative upscaling since it takes longer
        const increment = processingMode === 'generative_upscale' ? Math.random() * 3 : Math.random() * 10;
        if (prev >= 90) return prev;
        return prev + increment;
      });
    }, processingMode === 'generative_upscale' ? 2000 : 1000); // Slower updates for generative

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('processingMode', processingMode);
      formData.append('scale', scale.toString());

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout for generative upscaling

      const apiResponse = await fetch('/api/upscale', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Upscaling failed');
      }

      const data = await apiResponse.json();
      setUpscaledUrl(data.url);
      onUpscaleComplete?.(data.url);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Upscaling timed out. Please try again.');
      } else {
        setError(err.message || 'An unknown error occurred during upscaling.');
      }
    } finally {
      clearInterval(progressInterval);
      setIsUpscaling(false);
      setProgress(100); // Indicate completion or failure
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Image Upscaling Options</h3>
        
        {/* Processing Mode Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Processing Mode
          </label>
          <div className="grid gap-3">
            {processingModeOptions.map((option) => (
              <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="processingMode"
                  value={option.value}
                  checked={processingMode === option.value}
                  onChange={(e) => setProcessingMode(e.target.value as ProcessingMode)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Scale Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Scale Factor
          </label>
          <div className="flex space-x-4">
            {scaleOptions.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="scale"
                  value={option.value}
                  checked={scale === option.value}
                  onChange={(e) => setScale(parseInt(e.target.value) as 2 | 4)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Upscale Button */}
        <div className="mt-6">
          <button
            onClick={handleUpscale}
            disabled={isUpscaling}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            {isUpscaling 
              ? `⏳ ${processingMode === 'generative_upscale' ? 'Generating enhanced details...' : 'Upscaling...'}`
              : '🚀 UPSCALE IMAGE NOW 🚀'
            }
          </button>
        </div>

        {/* Progress Bar */}
        {isUpscaling && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {processingMode === 'generative_upscale' 
                  ? 'Generating enhanced details with AI...' 
                  : 'Processing...'
                }
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {processingMode === 'generative_upscale' && (
              <p className="text-xs text-gray-500 text-center">
                Generative upscaling may take longer due to AI processing complexity
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {upscaledUrl && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600 font-medium">Upscaling completed successfully!</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Upscaled Image:</h4>
              <img
                src={upscaledUrl}
                alt="Upscaled"
                className="max-w-full h-auto rounded-md border border-gray-200"
              />
              <div className="flex gap-2 mt-3">
                <a
                  href={upscaledUrl}
                  download="upscaled-image.png"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Download upscaled image
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    router.push(`/process/background-removal?imageUrl=${encodeURIComponent(upscaledUrl)}`);
                  }}
                >
                  <Scissors className="w-4 h-4 mr-1" />
                  Remove Background
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 