'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import {
  Upload,
  Loader2,
  Edit3,
  Download,
  Scissors,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface EditOptions {
  size: '256x256' | '512x512' | '1024x1024';
  count: number;
}

interface EditedImage {
  url: string;
  id?: string;
}

export function ImageEditor() {
  const { user, profile } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<EditOptions>({
    size: '1024x1024',
    count: 1,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedImages, setEditedImages] = useState<EditedImage[]>([]);
  const [enhanceForDTF, setEnhanceForDTF] = useState(true);

  // Check if user has access (admins always have access)
  const isAdmin = profile?.is_admin === true;
  const isPaidUser =
    profile?.subscription_tier && profile.subscription_tier !== 'free';
  const hasCredits = (profile?.credits_remaining || 0) > 0;

  // Calculate credit cost (Beta pricing)
  const sizeCredits = {
    '256x256': 1,
    '512x512': 1,
    '1024x1024': 1, // Beta pricing: 1 credit for all sizes
  };
  const creditCost = sizeCredits[options.size] || 1;
  const totalCost = creditCost * options.count;
  const canEdit =
    isAdmin ||
    (isPaidUser &&
      hasCredits &&
      (profile?.credits_remaining || 0) >= totalCost);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image must be less than 4MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        setOriginalImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMaskUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Mask must be less than 4MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        setMaskImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!originalImage) {
      toast.error('Please upload an image to edit');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please enter a prompt describing your edits');
      return;
    }

    if (!canEdit) {
      if (!isPaidUser && !isAdmin) {
        toast.error('AI image editing is only available for paid subscribers');
      } else if (!isAdmin) {
        toast.error(
          `You need ${totalCost} credits but only have ${profile?.credits_remaining || 0}`
        );
      }
      return;
    }

    setIsEditing(true);
    setEditedImages([]);

    try {
      const formData = new FormData();

      // Convert base64 to blob for the original image
      const imageResponse = await fetch(originalImage);
      const imageBlob = await imageResponse.blob();
      formData.append('image', imageBlob, 'image.png');

      // Add mask if provided
      if (maskImage) {
        const maskResponse = await fetch(maskImage);
        const maskBlob = await maskResponse.blob();
        formData.append('mask', maskBlob, 'mask.png');
      }

      formData.append('prompt', prompt);
      formData.append('size', options.size);
      formData.append('count', options.count.toString());
      formData.append('enhanceForDTF', enhanceForDTF.toString());

      const response = await fetch('/api/generate/edit', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresUpgrade) {
          toast.error('Please upgrade to a paid plan to use AI image editing');
        } else {
          toast.error(data.error || 'Failed to edit image');
        }
        return;
      }

      setEditedImages(data.images || []);
      toast.success(
        `Edited ${data.images.length} image${data.images.length > 1 ? 's' : ''}! ${totalCost} credits used.`
      );

      // Refresh user profile to update credits
      await useAuthStore.getState().refreshProfile();
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to edit image. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-edited-${Date.now()}-${index + 1}.png`;
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
          <Edit3 className="w-16 h-16 mx-auto text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          AI Image Editor{' '}
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
            Beta
          </span>
        </h2>
        <p className="text-gray-600 mb-6">
          Edit and transform images with AI using natural language prompts. This
          feature is exclusively available for paid subscribers.
        </p>
        <Link href="/pricing">
          <Button variant="primary" size="lg">
            Upgrade to Unlock AI Editing
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
            <Edit3 className="w-6 h-6 text-purple-600" />
            AI Image Editor
            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
              Beta
            </span>
          </h2>
          <p className="text-gray-600 mt-1">
            Edit images with AI using GPT-Image-1
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
          {/* Image Upload */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Upload Image to Edit</h3>

            <div className="space-y-4">
              {/* Original Image */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Original Image (Required)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-600 transition-colors"
                >
                  {originalImage ? (
                    <div className="relative aspect-square max-w-[300px] mx-auto">
                      <Image
                        src={originalImage}
                        alt="Original image"
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload image (PNG, JPG, max 4MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Mask Image (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mask Image (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Upload a mask to specify which areas to edit. White areas will
                  be edited, black areas preserved.
                </p>
                <div
                  onClick={() => maskInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-600 transition-colors"
                >
                  {maskImage ? (
                    <div className="relative aspect-square max-w-[200px] mx-auto">
                      <Image
                        src={maskImage}
                        alt="Mask image"
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-600">
                        Click to upload mask (Optional)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={maskInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMaskUpload}
                  className="hidden"
                />
                {maskImage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => setMaskImage(null)}
                  >
                    Remove Mask
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Edit Prompt */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Edit Instructions</h3>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the changes you want to make... (e.g., 'Change the background to a beach sunset', 'Add a red hat', 'Make it look vintage')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
              rows={4}
            />
          </Card>

          {/* Edit Options */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Edit Options</h3>

            {/* Size Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Output Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setOptions({ ...options, size: '256x256' })}
                  className={`p-2 rounded-lg border text-sm ${
                    options.size === '256x256'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Small
                  <br />
                  256×256
                </button>
                <button
                  onClick={() => setOptions({ ...options, size: '512x512' })}
                  className={`p-2 rounded-lg border text-sm ${
                    options.size === '512x512'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Medium
                  <br />
                  512×512
                </button>
                <button
                  onClick={() => setOptions({ ...options, size: '1024x1024' })}
                  className={`p-2 rounded-lg border text-sm ${
                    options.size === '1024x1024'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Large
                  <br />
                  1024×1024
                </button>
              </div>
            </div>

            {/* Count Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Number of Variations
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

            {/* DTF Enhancement Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enhanceForDTF}
                  onChange={e => setEnhanceForDTF(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium">
                  Optimize for DTF Printing
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-1 ml-6">
                Ensures transparent background and print-ready formatting
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

            {/* Edit Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              onClick={handleEdit}
              disabled={!canEdit || isEditing || !originalImage || !prompt}
            >
              {isEditing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Edit Image{options.count > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div>
          <Card className="p-6 min-h-[400px]">
            <h3 className="font-semibold mb-4">Edited Images</h3>

            {editedImages.length === 0 && !isEditing && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Edit3 className="w-16 h-16 mb-4" />
                <p className="text-center">
                  Your edited images will appear here
                </p>
              </div>
            )}

            {isEditing && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">
                  Editing your image{options.count > 1 ? 's' : ''}...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This may take up to 30 seconds
                </p>
              </div>
            )}

            {editedImages.length > 0 && (
              <div className="grid gap-4">
                {editedImages.map((image, index) => (
                  <div key={index} className="space-y-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={image.url}
                        alt={`Edited image ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </div>
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
