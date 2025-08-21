'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Upload, Image as ImageIcon, Loader2, X, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

interface GeneratedImage {
  url: string;
  id?: string;
  revised_prompt?: string;
}

interface ImageToImageDirectProps {
  onImagesGenerated: (images: GeneratedImage[]) => void;
  generationOptions: {
    size: '1024x1024' | '1792x1024' | '1024x1792';
    quality: 'standard' | 'hd';
    style: 'vivid' | 'natural';
    count: number;
  };
}

export function ImageToImageDirect({ 
  onImagesGenerated,
  generationOptions
}: ImageToImageDirectProps) {
  const { profile } = useAuthStore();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modificationInstructions, setModificationInstructions] = useState<string>('');

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
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('Image must be less than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      setUploadedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const generateFromImage = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }

    // Check if user has enough credits
    const creditCost = generationOptions.quality === 'hd' ? 2 : 1;
    const totalCost = creditCost * generationOptions.count;
    const isAdmin = profile?.is_admin === true;
    
    if (!isAdmin && (profile?.credits || 0) < totalCost) {
      toast.error(`You need ${totalCost} credits but only have ${profile?.credits || 0}`);
      return;
    }

    setIsGenerating(true);
    try {
      // Use FormData to send the image file instead of base64 in JSON
      const formData = new FormData();
      
      // Convert base64 to blob if we have a data URL
      if (uploadedImage.startsWith('data:')) {
        const response = await fetch(uploadedImage);
        const blob = await response.blob();
        formData.append('image', blob, uploadedFile?.name || 'image.png');
      } else if (uploadedFile) {
        formData.append('image', uploadedFile);
      }
      
      // Add other parameters
      formData.append('modifications', modificationInstructions || '');
      formData.append('size', generationOptions.size);
      formData.append('quality', generationOptions.quality);
      formData.append('style', generationOptions.style);
      formData.append('count', generationOptions.count.toString());

      const response = await fetch('/api/generate/from-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Pass generated images to parent
      onImagesGenerated(data.images || []);
      
      toast.success(`Generated ${data.images?.length || 0} image(s) successfully!`);
      
      // Refresh profile to update credits
      await useAuthStore.getState().refreshProfile();
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate image from reference');
    } finally {
      setIsGenerating(false);
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
            ${isDragging 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm font-medium mb-2">
            Drop your reference image here
          </p>
          <p className="text-xs text-gray-500 mb-4">
            AI will analyze and recreate it with your modifications
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="inline-block cursor-pointer">
            <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Choose Image
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Uploaded Image Preview */}
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-medium">Reference Image</h4>
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
                alt="Reference image"
                fill
                className="object-contain"
              />
            </div>
          </Card>

          {/* Modification Instructions */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">Modifications (Optional)</h4>
            <textarea
              value={modificationInstructions}
              onChange={(e) => setModificationInstructions(e.target.value)}
              placeholder="Describe any changes you want:
• Replace 'MOM' with 'GRANDMA'
• Remove the palm tree
• Change colors to blue and gold
• Add sparkles around the text
• Make the font more elegant

Leave empty to recreate as-is"
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              rows={6}
            />
          </Card>

          {/* Generate Button - Direct generation, no intermediate prompt */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={generateFromImage}
            disabled={isGenerating || !uploadedImage}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing & Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate from Image
              </>
            )}
          </Button>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>How it works:</strong> AI analyzes your image and recreates it with your modifications in one step. 
              The original image helps ensure accurate style and composition matching.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}