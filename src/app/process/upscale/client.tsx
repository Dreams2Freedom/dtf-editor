'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Wand2, Download, Loader2, ArrowLeft, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function UpscaleClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, refreshCredits, user } = useAuthStore();
  const imageId = searchParams.get('imageId');
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [selectedScale, setSelectedScale] = useState('2');
  const [showEnhancements, setShowEnhancements] = useState(false);

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

  // Process image with Deep-Image.ai
  const processImage = async () => {
    if (!imageUrl || !profile) {
      setError('Please wait for image to load and ensure you are logged in.');
      return;
    }

    // Check credits (skip for admins)
    const isAdmin = profile.is_admin === true;
    if (!isAdmin && profile.credits_remaining < 1) {
      setError('Insufficient credits. Please purchase more credits.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use the existing upscale API endpoint
      const formData = new FormData();
      formData.append('imageUrl', imageUrl);
      formData.append('processingMode', showEnhancements ? 'auto_enhance' : 'basic_upscale');
      // Deep-Image only supports 2x and 4x, so use 4x for 3x requests
      const actualScale = selectedScale === '3' ? '4' : selectedScale;
      formData.append('scale', actualScale);

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout
      
      const response = await fetch('/api/upscale', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // If not JSON, try to read as text
        const text = await response.text();
        console.error('[Upscale] Non-JSON response:', text);
        throw new Error(`Server error: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Processing failed with status ${response.status}`);
      }

      if (!result.success || !result.url) {
        throw new Error(result.error || 'No result URL received');
      }

      setProcessedUrl(result.url);
      
      // Refresh credits after successful processing
      await refreshCredits();

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. The image processing is taking too long. Please try with a smaller image or simpler settings.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Processing failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedUrl) return;
    
    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = `upscaled-${selectedScale}x.jpg`;
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
              { label: 'Upscale' }
            ]} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-blue-600" />
                Upscale Image
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
                          Upscale Factor
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['2', '3', '4'].map((scale) => (
                            <button
                              key={scale}
                              onClick={() => setSelectedScale(scale)}
                              className={`p-2 border rounded-lg transition-colors ${
                                selectedScale === scale
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {scale}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={showEnhancements}
                            onChange={(e) => setShowEnhancements(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">
                            Apply AI enhancements (denoise, deblur, color correction)
                          </span>
                        </label>
                      </div>

                      {profile && !profile.is_admin && profile.credits_remaining < 1 && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                          <p className="font-medium">Insufficient Credits</p>
                          <p className="text-xs mt-1">You need at least 1 credit to upscale an image. Please purchase more credits or upgrade your plan.</p>
                        </div>
                      )}

                      <Button
                        onClick={processImage}
                        disabled={isProcessing || !profile || (!profile.is_admin && profile.credits_remaining < 1)}
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
                            <Wand2 className="w-5 h-5 mr-2" />
                            Upscale Image ({selectedScale}x)
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Processed Result */}
                  {processedUrl && (
                    <div className="space-y-4">
                      <h3 className="font-medium mb-2">Upscaled Result</h3>
                      <img 
                        src={processedUrl} 
                        alt="Upscaled" 
                        className="max-w-full h-auto rounded-lg border"
                        style={{ maxHeight: '600px' }}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={downloadImage}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Result
                        </Button>
                        <Button
                          onClick={async () => {
                            console.log('Remove Background clicked');
                            console.log('processedUrl:', processedUrl);
                            console.log('processedUrl type:', typeof processedUrl);
                            console.log('processedUrl length:', processedUrl?.length);
                            console.log('Is data URL?', processedUrl?.startsWith('data:'));
                            
                            // Check if processedUrl is valid
                            if (!processedUrl) {
                              alert('No processed image URL available. Please wait for the image to finish processing.');
                              return;
                            }
                            
                            // If it's a data URL and too large, handle differently
                            if (processedUrl.startsWith('data:') && processedUrl.length > 2000) {
                              console.log('Data URL is too large for URL parameter');
                              
                              // Store in sessionStorage and navigate with a key
                              const storageKey = `temp_image_${Date.now()}`;
                              try {
                                sessionStorage.setItem(storageKey, processedUrl);
                                console.log('Stored image in sessionStorage with key:', storageKey);
                                
                                // Navigate with the storage key instead
                                const targetUrl = `/process/background-removal?tempImage=${storageKey}`;
                                router.push(targetUrl);
                              } catch (storageError) {
                                console.error('Failed to store in sessionStorage:', storageError);
                                alert('The image is too large to process directly. Please download it first and then upload it to the background removal tool.');
                              }
                              return;
                            }
                            
                            // For regular URLs or small data URLs
                            const targetUrl = `/process/background-removal?imageUrl=${encodeURIComponent(processedUrl)}`;
                            console.log('Target URL:', targetUrl);
                            console.log('Target URL length:', targetUrl.length);
                            
                            try {
                              console.log('Attempting navigation...');
                              router.push(targetUrl);
                            } catch (error) {
                              console.error('Navigation failed:', error);
                              alert('Unable to navigate. Please check the browser console for details.');
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
                            setSelectedScale('2');
                            setShowEnhancements(false);
                          }}
                          variant="outline"
                        >
                          Upscale Again
                        </Button>
                      </div>
                      <p className="text-sm text-green-600">
                        ✓ Image upscaled and saved to your account
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">AI Upscaling Features:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Increase resolution by 2x, 3x, or 4x</li>
                      <li>AI-powered detail enhancement</li>
                      <li>Optional noise reduction and sharpening</li>
                      <li>Automatic color and lighting correction</li>
                      <li>Preserves image quality while enlarging</li>
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