'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Zap, Download, Loader2, ArrowLeft, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SignupModal } from '@/components/auth/SignupModal';

export default function VectorizeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, refreshCredits, user } = useAuthStore();
  const imageId = searchParams.get('imageId');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedImageId, setProcessedImageId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('svg');
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Load image data
  useEffect(() => {
    if (!imageId) {
      router.push('/process');
      return;
    }

    // Fetch image URL from database
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/uploads/${imageId}`, {
          credentials: 'include', // Include cookies for authentication
        });
        const data = await response.json();

        if (data.success) {
          setImageUrl(data.publicUrl);
        } else {
          throw new Error(data.error || 'Failed to load image');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [imageId, router]);

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

  // Process image with Vectorizer.ai
  const processImage = async () => {
    if (!imageUrl) return;

    if (!user || !profile) {
      setShowSignupModal(true);
      return;
    }

    // Skip client-side credit check - let server handle it
    // This avoids sync issues between client and server

    setIsProcessing(true);
    setError(null);

    try {
      // First, we need to fetch the image from the URL and convert it to a file
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();

      // Create a file from the blob
      const fileName = `image_${Date.now()}.${imageBlob.type.split('/')[1] || 'png'}`;
      let imageFile = new File([imageBlob], fileName, { type: imageBlob.type });

      // Check if compression is needed for large files
      const { compressImage, needsCompression } = await import(
        '@/utils/imageCompression'
      );
      if (await needsCompression(imageFile, 10, 4096)) {
        console.log(
          '[Vectorizer] Compressing large image before processing...'
        );
        imageFile = await compressImage(imageFile, {
          maxSizeMB: 10,
          maxWidthOrHeight: 4096,
          quality: 0.9,
        });
        console.log('[Vectorizer] Compression complete:', {
          originalSize: `${(imageBlob.size / 1024 / 1024).toFixed(2)}MB`,
          compressedSize: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      // Use the process API endpoint
      const formData = new FormData();
      formData.append('image', imageFile); // Changed from imageUrl to image file
      formData.append('operation', 'vectorization');
      formData.append('vectorFormat', selectedFormat); // Changed from outputFormat to vectorFormat

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      console.log('Vectorize API response:', result);
      if (result.metadata) {
        console.log('Save details:', {
          saveAttempted: result.metadata.saveAttempted,
          savedId: result.metadata.savedId,
          saveError: result.metadata.saveError,
        });
      }

      if (!response.ok) {
        // If it's an insufficient credits error, refresh the profile
        if (result.error?.includes('Insufficient credits')) {
          await refreshCredits();
        }
        throw new Error(result.error || 'Processing failed');
      }

      if (!result.success || !result.processedUrl) {
        throw new Error('No result URL received');
      }

      setProcessedUrl(result.processedUrl);

      // Store the saved image ID if available
      if (result.metadata?.savedId) {
        console.log('Vectorize saved with ID:', result.metadata.savedId);
        setProcessedImageId(result.metadata.savedId);
      }

      // Refresh credits after successful processing
      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async () => {
    if (!processedUrl) return;

    try {
      // Fetch the image and create a blob URL for proper downloading
      const response = await fetch(processedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `vectorized.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab if fetch fails
      window.open(processedUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-4xl mx-auto p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: 'Process Image', href: '/process' },
                { label: 'Vectorize' },
              ]}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-600" />
                Vectorize Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && !imageUrl && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading image...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {imageUrl && (
                <div className="space-y-6">
                  {/* Original Image */}
                  <div>
                    <h3 className="font-medium mb-2">Original Image</h3>
                    <img
                      src={imageUrl}
                      alt="Original"
                      className="max-w-full h-auto rounded-lg border"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>

                  {/* Processing Options */}
                  {!processedUrl && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Output Format
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setSelectedFormat('svg')}
                            className={`p-3 border rounded-lg transition-colors ${
                              selectedFormat === 'svg'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">SVG</div>
                            <div className="text-xs mt-1">Scalable Vector</div>
                          </button>
                          <button
                            onClick={() => setSelectedFormat('pdf')}
                            className={`p-3 border rounded-lg transition-colors ${
                              selectedFormat === 'pdf'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">PDF</div>
                            <div className="text-xs mt-1">Document Format</div>
                          </button>
                          <button
                            onClick={() => setSelectedFormat('png')}
                            className={`p-3 border rounded-lg transition-colors ${
                              selectedFormat === 'png'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">PNG</div>
                            <div className="text-xs mt-1">4x Transparent</div>
                          </button>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                        <p className="font-medium text-yellow-800">
                          ⚠️ This operation uses 2 credits
                        </p>
                      </div>

                      {profile &&
                        !profile.is_admin &&
                        profile.credits_remaining < 2 && (
                          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                            <p className="font-medium">Insufficient Credits</p>
                            <p className="text-xs mt-1">
                              You need at least 2 credits to vectorize an image.
                              Please purchase more credits or upgrade your plan.
                            </p>
                          </div>
                        )}

                      <Button
                        onClick={processImage}
                        disabled={
                          isProcessing ||
                          !profile ||
                          (!profile.is_admin && profile.credits_remaining < 2)
                        }
                        className="w-full"
                        size="lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Vectorize Image (2 credits)
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Processed Result */}
                  {processedUrl && (
                    <div className="space-y-4">
                      <h3 className="font-medium mb-2">Vectorized Result</h3>
                      {selectedFormat === 'svg' || selectedFormat === 'png' ? (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <img
                            src={processedUrl}
                            alt="Vectorized"
                            className="max-w-full h-auto"
                            style={{
                              maxHeight: '400px',
                              ...(selectedFormat === 'png'
                                ? {
                                    backgroundColor: '#f0f0f0',
                                    backgroundImage:
                                      'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)',
                                    backgroundSize: '20px 20px',
                                  }
                                : {}),
                            }}
                          />
                        </div>
                      ) : (
                        <div className="border rounded-lg p-8 bg-gray-50 text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-gray-600">
                            PDF file ready for download
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={downloadImage}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download {selectedFormat.toUpperCase()}
                        </Button>
                        <Button
                          onClick={() => {
                            console.log(
                              '[Vectorize] Remove Background clicked'
                            );
                            console.log(
                              '[Vectorize] processedImageId:',
                              processedImageId
                            );
                            console.log(
                              '[Vectorize] processedUrl:',
                              processedUrl
                            );

                            // Check if processedUrl is valid
                            if (!processedUrl) {
                              alert(
                                'No processed image URL available. Please wait for the image to finish processing.'
                              );
                              return;
                            }

                            // Prefer using image ID for navigation (much shorter URL)
                            if (processedImageId) {
                              console.log(
                                '[Vectorize] Using image ID for navigation:',
                                processedImageId
                              );
                              const targetUrl = `/process/background-removal?imageId=${processedImageId}`;
                              router.push(targetUrl);
                              return;
                            }

                            // SVG files are typically data URLs and can be very large
                            // For vectorized images, we should handle them specially
                            if (
                              processedUrl.startsWith('data:') &&
                              processedUrl.length > 2000
                            ) {
                              console.log(
                                '[Vectorize] Data URL is too large for URL parameter'
                              );

                              // Store in sessionStorage and navigate with a key
                              const storageKey = `temp_image_${Date.now()}`;
                              try {
                                sessionStorage.setItem(
                                  storageKey,
                                  processedUrl
                                );
                                console.log(
                                  '[Vectorize] Stored image in sessionStorage with key:',
                                  storageKey
                                );

                                // Navigate with the storage key instead
                                const targetUrl = `/process/background-removal?tempImage=${storageKey}`;
                                router.push(targetUrl);
                              } catch (storageError) {
                                console.error(
                                  '[Vectorize] Failed to store in sessionStorage:',
                                  storageError
                                );
                                alert(
                                  'The vectorized image is too large to process directly. Please download it first and then upload it to the background removal tool.'
                                );
                              }
                              return;
                            }

                            // For regular URLs or small data URLs
                            const targetUrl = `/process/background-removal?imageUrl=${encodeURIComponent(processedUrl)}`;
                            console.log('[Vectorize] Target URL:', targetUrl);
                            console.log(
                              '[Vectorize] Target URL length:',
                              targetUrl.length
                            );

                            try {
                              console.log(
                                '[Vectorize] Attempting navigation...'
                              );
                              router.push(targetUrl);
                            } catch (error) {
                              console.error(
                                '[Vectorize] Navigation failed:',
                                error
                              );
                              alert(
                                'Unable to navigate. Please check the browser console for details.'
                              );
                            }
                          }}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          <Scissors className="w-4 h-4" />
                          Remove Background
                        </Button>
                        <Button
                          onClick={() => {
                            setProcessedUrl(null);
                            setProcessedImageId(null);
                            setSelectedFormat('svg');
                          }}
                          variant="secondary"
                        >
                          Vectorize Again
                        </Button>
                      </div>
                      <p className="text-sm text-green-600">
                        ✓ Image vectorized and saved to your account
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">
                      Vectorization Benefits:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Convert raster images to scalable vectors</li>
                      <li>Infinite scaling without quality loss</li>
                      <li>Perfect for logos and graphics</li>
                      <li>Smaller file sizes for simple designs</li>
                      <li>Edit individual shapes and colors</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Signup Modal */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        feature="AI image vectorization"
      />
    </div>
  );
}
