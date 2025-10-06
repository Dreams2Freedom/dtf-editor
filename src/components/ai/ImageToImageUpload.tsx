'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Upload, Image as ImageIcon, Loader2, X, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface ImageToImageUploadProps {
  onAnalysisComplete: (generatedPrompt: string) => void;
  isDisabled?: boolean;
}

export function ImageToImageUpload({
  onAnalysisComplete,
  isDisabled = false,
}: ImageToImageUploadProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modificationInstructions, setModificationInstructions] =
    useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleImageFile(imageFile);
    } else {
      toast.error('Please upload an image file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleImageFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      toast.error('Image must be less than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      setUploadedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!uploadedImage) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageUrl: uploadedImage,
          analysisType: 'describe_for_recreation',
          customInstructions: modificationInstructions
            ? `IMPORTANT MODIFICATIONS REQUIRED: ${modificationInstructions}. Analyze the image and create a prompt that incorporates these specific changes.`
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      // Use the recreation prompt or fall back to analysis
      const prompt = data.recreationPrompt || data.analysis;

      // Callback to parent component with generated prompt
      onAnalysisComplete(prompt);

      toast.success('Image analyzed! Switching to text mode...');

      // Clear upload state after successful analysis
      setTimeout(() => {
        clearUpload();
      }, 500);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setModificationInstructions('');
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!uploadedImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              isDragging
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm font-medium mb-2">
            Drop your image here or click to browse
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Upload an image to recreate or modify it
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="inline-block cursor-pointer">
            <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
              Choose Image
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Uploaded Image Preview */}
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-medium">Uploaded Image</h4>
              <button
                onClick={clearUpload}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={uploadedImage}
                alt="Uploaded image"
                fill
                className="object-contain"
              />
            </div>
          </Card>

          {/* Modification Instructions */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">What Changes Do You Want?</h4>
            <p className="text-xs text-gray-600 mb-3">
              Describe any modifications you want to make to this design:
            </p>
            <textarea
              value={modificationInstructions}
              onChange={e => setModificationInstructions(e.target.value)}
              placeholder="Examples:
• Replace 'MOM' with 'GRANDMA'
• Remove the palm tree in the background
• Change the color scheme to blue and gold
• Add sparkles around the text
• Make the font more elegant
• Remove all background elements"
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              rows={6}
            />
            <div className="mt-2 text-xs text-gray-500">
              Leave empty to recreate the image as-is, or describe specific
              changes you want.
            </div>
          </Card>

          {/* Analyze Button */}
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={analyzeImage}
            disabled={isAnalyzing || isDisabled}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Image...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Analyze & Generate Prompt
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
