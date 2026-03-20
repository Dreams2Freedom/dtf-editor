'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Wand2, Scissors, Zap, ArrowRight, Palette } from 'lucide-react';
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
import { BulkUpscaleTool } from '@/components/image/BulkUpscaleTool';
import { BulkBgRemovalTool } from '@/components/image/BulkBgRemovalTool';

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
  const [processMode, setProcessMode] = useState<'single' | 'bulk'>('single');

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

        // Handle 413 error specifically (Vercel returns HTML, not JSON)
        if (response.status === 413) {
          throw new Error(
            'Image still too large after compression. Please try a smaller image.'
          );
        }

        // Try to parse JSON response
        let result;
        try {
          result = await response.json();
        } catch {
          throw new Error(
            `Upload failed with status ${response.status}. Please try again.`
          );
        }

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

          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Image Processing
            </h1>
            {profile && (
              <p className="text-sm text-gray-500 mt-1">
                {profile?.credits ?? profile?.credits_remaining ?? 0} credits remaining
              </p>
            )}
          </div>

          {/* Single / Bulk Mode Toggle */}
          <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-100">
            <button
              onClick={() => setProcessMode('single')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                processMode === 'single'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => setProcessMode('bulk')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                processMode === 'bulk'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulk Upload
            </button>
          </div>

          {/* Bulk Mode */}
          {processMode === 'bulk' && (
            <div className="space-y-4">
              {/* Info banner about bulk availability */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Bulk processing</strong> is available for{' '}
                  <strong>Upscaling</strong> and{' '}
                  <strong>Background Removal</strong>. Vectorization bulk
                  processing is coming soon.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-blue-600" />
                    Bulk Upscale Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BulkUpscaleTool />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="w-6 h-6 text-green-600" />
                    Bulk Remove Backgrounds
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BulkBgRemovalTool />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upload Area (Single Mode only) */}
          {processMode === 'single' && !selectedFile && (
            <Card>
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-300 hover:border-amber-300 hover:bg-amber-50/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Upload className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-800 mb-1">
                    {isDragActive
                      ? 'Drop your image here'
                      : 'Upload an image to get started'}
                  </p>
                  <p className="text-gray-500 text-sm mb-3">
                    Drag & drop or click to select
                  </p>
                  <p className="text-xs text-gray-400">
                    JPEG, PNG, WebP • Large images auto-compressed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combined Preview and Tool Selection (Single Mode only) */}
          {processMode === 'single' && selectedFile && imagePreview && (
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
                    {/* Tool cards */}
                    {[
                      { key: 'upscale', icon: Wand2, name: 'Upscale Image', desc: 'Enhance resolution up to 4x', cost: '1 credit', color: 'blue' },
                      { key: 'background-removal', icon: Scissors, name: 'Remove Background', desc: 'Professional background removal', cost: '1 credit', color: 'green' },
                      { key: 'vectorize', icon: Zap, name: 'Vectorize', desc: 'Convert to scalable vector', cost: '2 credits', color: 'purple' },
                      { key: 'color-change', icon: Palette, name: 'Change Colors', desc: 'Replace specific colors in your design', cost: 'Free', color: 'amber' },
                    ].map(tool => {
                      const colorMap: Record<string, { ring: string; bg: string; iconBg: string; iconText: string; hoverBorder: string }> = {
                        blue: { ring: 'ring-blue-500', bg: 'bg-blue-50', iconBg: 'bg-blue-50', iconText: 'text-blue-600', hoverBorder: 'hover:border-blue-200' },
                        green: { ring: 'ring-green-500', bg: 'bg-green-50', iconBg: 'bg-green-50', iconText: 'text-green-600', hoverBorder: 'hover:border-green-200' },
                        purple: { ring: 'ring-purple-500', bg: 'bg-purple-50', iconBg: 'bg-purple-50', iconText: 'text-purple-600', hoverBorder: 'hover:border-purple-200' },
                        amber: { ring: 'ring-amber-500', bg: 'bg-amber-50', iconBg: 'bg-amber-50', iconText: 'text-amber-600', hoverBorder: 'hover:border-amber-200' },
                      };
                      const c = colorMap[tool.color];
                      const isSelected = preselectedOperation === tool.key;

                      return (
                        <div
                          key={tool.key}
                          className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all ${
                            isProcessing
                              ? 'opacity-50 cursor-not-allowed'
                              : isSelected
                                ? `ring-2 ${c.ring} ${c.bg}`
                                : `border-gray-200 ${c.hoverBorder} hover:shadow-sm`
                          }`}
                          onClick={() => !isProcessing && navigateToTool(tool.key)}
                        >
                          <div className={`w-11 h-11 ${c.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <tool.icon className={`w-5 h-5 ${c.iconText}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900">{tool.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{tool.desc}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400">{tool.cost}</p>
                            <ArrowRight className="w-4 h-4 text-gray-300 ml-auto mt-0.5" />
                          </div>
                        </div>
                      );
                    })}
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
    case 'color-change':
      return 'Color Change';
    default:
      return 'Processing';
  }
}
