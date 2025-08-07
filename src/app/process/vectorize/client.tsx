'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Zap, Download, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

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
  const [selectedFormat, setSelectedFormat] = useState('svg');

  // Load image data
  useEffect(() => {
    if (!imageId) {
      router.push('/process');
      return;
    }

    // Fetch image URL from database
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/uploads/${imageId}`);
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
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user, refreshCredits]);

  // Process image with Vectorizer.ai
  const processImage = async () => {
    if (!imageUrl || !profile) return;

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
      const imageFile = new File([imageBlob], fileName, { type: imageBlob.type });

      // Use the process API endpoint
      const formData = new FormData();
      formData.append('image', imageFile);  // Changed from imageUrl to image file
      formData.append('operation', 'vectorization');
      formData.append('vectorFormat', selectedFormat);  // Changed from outputFormat to vectorFormat

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      console.log('Vectorize API response:', result);
      if (result.metadata) {
        console.log('Save details:', {
          saveAttempted: result.metadata.saveAttempted,
          savedId: result.metadata.savedId,
          saveError: result.metadata.saveError
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
      
      // Refresh credits after successful processing
      await refreshCredits();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedUrl) return;
    
    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = `vectorized.${selectedFormat}`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-4xl mx-auto p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[
              { label: 'Process Image', href: '/process' },
              { label: 'Vectorize' }
            ]} />
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
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedFormat('svg')}
                            className={`p-3 border rounded-lg transition-colors ${
                              selectedFormat === 'svg'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">SVG</div>
                            <div className="text-xs mt-1">Scalable Vector Graphics</div>
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
                            <div className="text-xs mt-1">Portable Document Format</div>
                          </button>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                        <p className="font-medium text-yellow-800">⚠️ This operation uses 2 credits</p>
                      </div>

                      {profile && !profile.is_admin && profile.credits_remaining < 2 && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                          <p className="font-medium">Insufficient Credits</p>
                          <p className="text-xs mt-1">You need at least 2 credits to vectorize an image. Please purchase more credits or upgrade your plan.</p>
                        </div>
                      )}

                      <Button
                        onClick={processImage}
                        disabled={isProcessing || !profile || (!profile.is_admin && profile.credits_remaining < 2)}
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
                      {selectedFormat === 'svg' ? (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <img 
                            src={processedUrl} 
                            alt="Vectorized" 
                            className="max-w-full h-auto"
                            style={{ maxHeight: '400px' }}
                          />
                        </div>
                      ) : (
                        <div className="border rounded-lg p-8 bg-gray-50 text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-gray-600">PDF file ready for download</p>
                        </div>
                      )}
                      <div className="flex gap-4">
                        <Button
                          onClick={downloadImage}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download {selectedFormat.toUpperCase()}
                        </Button>
                        <Button
                          onClick={() => {
                            setProcessedUrl(null);
                            setSelectedFormat('svg');
                          }}
                          variant="outline"
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
                    <h4 className="font-medium mb-2">Vectorization Benefits:</h4>
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
    </div>
  );
}