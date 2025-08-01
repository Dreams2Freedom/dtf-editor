'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Wand2, Scissors, Zap, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { formatFileSize } from '@/lib/utils';

export default function ProcessPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Store the uploaded URL instead of ID
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image file.';
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB.';
    }

    return null;
  }, []);

  // Handle file drop/selection
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadedImageUrl(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  // Upload image to storage
  const uploadImage = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        // Store the URL instead of ID for direct use
        setUploadedImageUrl(result.publicUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Navigate to tool with image URL
  const navigateToTool = (tool: string) => {
    if (!uploadedImageUrl) {
      setUploadError('Please upload an image first');
      return;
    }
    // Encode the URL to pass it as a query parameter
    const encodedUrl = encodeURIComponent(uploadedImageUrl);
    router.push(`/process/${tool}?imageUrl=${encodedUrl}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">DTF Editor</h1>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link href="/process" className="text-blue-600 font-medium">Process</Link>
                <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Image Processing
            </h1>
            <p className="text-gray-600">
              Upload an image and select a processing tool
            </p>
            {profile && (
              <p className="text-sm text-blue-600 mt-2">
                You have {profile.credits_remaining} credits remaining
              </p>
            )}
          </div>

          {/* Upload Area */}
          <Card>
            <CardContent className="p-8">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-colors duration-200 ease-in-out
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${selectedFile ? 'bg-gray-50' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{selectedFile?.name}</p>
                      <p>{selectedFile && formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setImagePreview(null);
                        setUploadedImageUrl(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        {isDragActive ? 'Drop your image here' : 'Drag & drop your image here'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        or click to select from your computer
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Supports JPEG, PNG, WebP • Max 10MB
                    </p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {uploadError}
                </div>
              )}

              {selectedFile && !uploadedImageUrl && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={uploadImage}
                    disabled={isUploading}
                    size="lg"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
              )}

              {uploadedImageUrl && (
                <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm text-center">
                  ✅ Image uploaded successfully! Select a tool below.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Tools */}
          {uploadedImageUrl && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigateToTool('upscale')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-blue-600" />
                    AI Upscale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Enhance resolution up to 4x with AI
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">1 credit</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigateToTool('background-removal')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-green-600" />
                    Remove Background
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Professional background removal
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">1 credit</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigateToTool('vectorize')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Vectorize
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Convert to scalable vector format
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">2 credits</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}