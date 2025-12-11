'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Wand2, Scissors, Zap, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { formatFileSize } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SignupModal } from '@/components/auth/SignupModal';
import { compressImage } from '@/lib/image-compression';

export default function ProcessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, refreshCredits } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preselectedOperation, setPreselectedOperation] = useState<
    string | null
  >(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingTool, setPendingTool] = useState<string | null>(null);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image file.';
    }

    const maxSize = 50 * 1024 * 1024; // 50MB (Vercel Pro)
    if (file.size > maxSize) {
      return 'File size must be less than 50MB.';
    }

    return null;
  }, []);

  // Upload image automatically
  const uploadImage = useCallback(
    async (file: File) => {
      if (!user) {
        setShowSignupModal(true);
        return null;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        // Compress image if needed to stay within Vercel's 4.5MB API route limit
        // Target 3MB to account for FormData encoding overhead (~33%)
        const fileToUpload = await compressImage(file, {
          maxSizeMB: 3,
          maxDimension: 5000,
        });

        console.log('[Process] Uploading file:', {
          originalSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          uploadSize: (fileToUpload.size / 1024 / 1024).toFixed(2) + ' MB',
          wasCompressed: fileToUpload !== file,
        });

        const formData = new FormData();
        formData.append('image', fileToUpload);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const result = await response.json();

        if (result.success) {
          setUploadedImageId(result.imageId);
          return result.imageId;
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : 'Upload failed'
        );
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [user]
  );

  // Handle file drop/selection with auto-upload
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
      setUploadedImageId(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = e => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Auto-upload the image
      if (user) {
        await uploadImage(file);
      }
    },
    [validateFile, user, uploadImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Check for preselected operation and image from URL
  useEffect(() => {
    const operation = searchParams.get('operation');
    if (operation) {
      setPreselectedOperation(operation);
    }

    // Handle incoming image URL (e.g., from AI generation "Process Further" button)
    const imageUrlParam = searchParams.get('image');
    if (imageUrlParam && !selectedFile) {
      // Fetch and load the image from URL
      const loadImageFromUrl = async () => {
        try {
          setIsUploading(true);
          const response = await fetch(imageUrlParam);
          if (!response.ok) {
            throw new Error('Failed to fetch image from URL');
          }

          const blob = await response.blob();

          // Validate that it's an image
          if (!blob.type.startsWith('image/')) {
            throw new Error('URL does not point to a valid image');
          }

          // Create file from blob
          let extension = 'jpg';
          if (blob.type === 'image/png') extension = 'png';
          else if (blob.type === 'image/webp') extension = 'webp';
          else if (blob.type === 'image/gif') extension = 'gif';

          const file = new File([blob], `image.${extension}`, {
            type: blob.type,
          });

          // Validate the file
          const validationError = validateFile(file);
          if (validationError) {
            setUploadError(validationError);
            setIsUploading(false);
            return;
          }

          setSelectedFile(file);
          setUploadError(null);

          // Create preview
          const reader = new FileReader();
          reader.onload = e => {
            setImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);

          // Auto-upload if user is logged in
          if (user) {
            await uploadImage(file);
          }
        } catch (error) {
          setUploadError(
            error instanceof Error
              ? error.message
              : 'Failed to load image from URL'
          );
        } finally {
          setIsUploading(false);
        }
      };

      loadImageFromUrl();
    }
  }, [searchParams, selectedFile, user, uploadImage, validateFile]);

  // Auto-navigate when image is uploaded and operation is preselected
  useEffect(() => {
    if (uploadedImageId && preselectedOperation && !isProcessing) {
      // Auto-navigate to the preselected tool
      navigateToTool(preselectedOperation);
    }
  }, [uploadedImageId, preselectedOperation, isProcessing]);

  // Refresh credits when page loads or regains focus
  useEffect(() => {
    if (user) {
      refreshCredits();

      // Refresh on window focus
      const handleFocus = () => refreshCredits();
      window.addEventListener('focus', handleFocus);

      // Refresh on visibility change (tab switching)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          refreshCredits();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      };
    }
  }, [user, refreshCredits]);

  // Navigate to tool with automatic upload if needed
  const navigateToTool = async (tool: string) => {
    if (isProcessing) return;

    // If not logged in, show signup modal and save tool for later
    if (!user) {
      setPendingTool(tool);
      setShowSignupModal(true);
      return;
    }

    setIsProcessing(true);
    let imageId = uploadedImageId;

    // If not uploaded yet, upload now
    if (!imageId && selectedFile) {
      imageId = await uploadImage(selectedFile);
    }

    if (!imageId) {
      setUploadError('Please select an image first');
      setIsProcessing(false);
      return;
    }

    // Navigate to the tool
    router.push(`/process/${tool}?imageId=${imageId}`);
  };

  // Handle signup modal close
  const handleSignupModalClose = () => {
    setShowSignupModal(false);

    // If user signed up and there's a pending tool, navigate to it
    if (user && pendingTool && selectedFile) {
      navigateToTool(pendingTool);
      setPendingTool(null);
    }
  };

  // Watch for user changes to handle pending navigation
  useEffect(() => {
    if (user && pendingTool && selectedFile) {
      navigateToTool(pendingTool);
      setPendingTool(null);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="py-4">
        <div className="max-w-6xl mx-auto p-4 space-y-4">
          {/* Breadcrumb */}
          <Breadcrumb items={[{ label: 'Process Image' }]} />

          {/* Compact Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              AI Image Processing
            </h1>
            {profile && (
              <p className="text-sm text-blue-600 mt-1">
                {profile?.credits ?? profile?.credits_remaining ?? 0} credits
                remaining
              </p>
            )}
          </div>

          {/* Upload Area */}
          {!selectedFile && (
            <Card>
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-base font-medium text-gray-700 mb-1">
                    {isDragActive
                      ? 'Drop your image here'
                      : 'Drag & drop an image here'}
                  </p>
                  <p className="text-gray-500 text-sm mb-2">
                    or click to select a file
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports JPEG, PNG, WebP • Large images auto-compressed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combined Preview and Tool Selection */}
          {selectedFile && imagePreview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Image Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Selected Image
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                        setUploadedImageId(null);
                        setUploadError(null);
                      }}
                    >
                      Change
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-lg border bg-gray-50">
                      <OptimizedImage
                        src={imagePreview}
                        alt="Selected"
                        fill
                        className="object-contain"
                        quality={90}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 text-center">
                        {selectedFile.name} •{' '}
                        {formatFileSize(selectedFile.size)}
                      </p>

                      {isUploading && (
                        <div className="text-center text-blue-600">
                          <div className="inline-flex items-center gap-2 text-sm">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Uploading...
                          </div>
                        </div>
                      )}

                      {uploadedImageId && !isUploading && (
                        <div className="text-center text-green-600 text-sm">
                          ✓ Ready to process
                        </div>
                      )}

                      {uploadError && (
                        <p className="text-xs text-red-600 text-center">
                          {uploadError}
                        </p>
                      )}

                      {!user && (
                        <p className="text-xs text-amber-600 text-center">
                          Sign up free to process images
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right: Tool Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {isUploading
                      ? 'Uploading Image...'
                      : preselectedOperation
                        ? `Processing with ${getOperationName(preselectedOperation)}...`
                        : 'Select Processing Tool'}
                  </CardTitle>
                  {!uploadedImageId &&
                    !isUploading &&
                    !preselectedOperation && (
                      <p className="text-xs text-gray-500">
                        Click a tool to start processing
                      </p>
                    )}
                  {preselectedOperation && !uploadedImageId && !isUploading && (
                    <p className="text-xs text-gray-500">
                      Will automatically proceed to{' '}
                      {getOperationName(preselectedOperation)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Upscale */}
                    <Card
                      className={`cursor-pointer transition-all ${
                        isProcessing
                          ? 'opacity-50 cursor-not-allowed'
                          : preselectedOperation === 'upscale'
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:shadow-md hover:border-blue-500'
                      }`}
                      onClick={() => !isProcessing && navigateToTool('upscale')}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <Wand2 className="w-10 h-10 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">
                            Upscale Image
                          </h3>
                          <p className="text-xs text-gray-600">
                            Enhance resolution up to 4x
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">1 credit</p>
                          <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Background Removal */}
                    <Card
                      className={`cursor-pointer transition-all ${
                        isProcessing
                          ? 'opacity-50 cursor-not-allowed'
                          : preselectedOperation === 'background-removal'
                            ? 'ring-2 ring-green-500 bg-green-50'
                            : 'hover:shadow-md hover:border-green-500'
                      }`}
                      onClick={() =>
                        !isProcessing && navigateToTool('background-removal')
                      }
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <Scissors className="w-10 h-10 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">
                            Remove Background
                          </h3>
                          <p className="text-xs text-gray-600">
                            Professional background removal
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">1 credit</p>
                          <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vectorization */}
                    <Card
                      className={`cursor-pointer transition-all ${
                        isProcessing
                          ? 'opacity-50 cursor-not-allowed'
                          : preselectedOperation === 'vectorize'
                            ? 'ring-2 ring-purple-500 bg-purple-50'
                            : 'hover:shadow-md hover:border-purple-500'
                      }`}
                      onClick={() =>
                        !isProcessing && navigateToTool('vectorize')
                      }
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <Zap className="w-10 h-10 text-purple-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">Vectorize</h3>
                          <p className="text-xs text-gray-600">
                            Convert to scalable vector
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">2 credits</p>
                          <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {profile &&
                    (profile?.credits ?? profile?.credits_remaining ?? 0) <
                      1 && (
                      <p className="text-xs text-red-600 text-center mt-3">
                        Insufficient credits. Please purchase more credits.
                      </p>
                    )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Signup Modal */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={handleSignupModalClose}
        feature="AI image processing"
      />
    </div>
  );
}

// Helper function to get operation display name
function getOperationName(operation: string): string {
  switch (operation) {
    case 'upscale':
      return 'Upscale';
    case 'background-removal':
      return 'Background Removal';
    case 'vectorize':
      return 'Vectorization';
    default:
      return 'Processing';
  }
}
