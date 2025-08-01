'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Scissors, Download, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

export default function BackgroundRemovalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, refreshCredits, user } = useAuthStore();
  const imageId = searchParams.get('imageId');
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ id: number; secret: string } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processedImageId, setProcessedImageId] = useState<string | null>(null);
  const [creditsDeducted, setCreditsDeducted] = useState(false);
  const [resultGenerated, setResultGenerated] = useState(false);

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
          // Convert data URL to File object for upload
          const res = await fetch(data.publicUrl);
          const blob = await res.blob();
          const file = new File([blob], 'image.jpg', { type: blob.type });
          setImageFile(file);
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

  // Load ClippingMagic script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.async = true;
    
    script.onload = () => {
      console.log('ClippingMagic script loaded');
      setScriptLoaded(true);
      
      if (window.ClippingMagic) {
        const errors = window.ClippingMagic.initialize({ apiId: 24469 });
        
        if (errors.length === 0) {
          console.log('ClippingMagic initialized successfully');
          setInitialized(true);
        } else {
          console.error('ClippingMagic initialization errors:', errors);
          setError('Failed to initialize ClippingMagic');
        }
      }
    };
    
    script.onerror = () => {
      setError('Failed to load ClippingMagic script');
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Upload image to ClippingMagic
  const uploadToClippingMagic = async () => {
    if (!imageFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/clippingmagic/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success && result.image) {
        setUploadedImage(result.image);
        // Credits will be deducted when result is generated
        // Automatically open editor after upload
        setTimeout(() => {
          openEditor(result.image);
        }, 500);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Download processed image from ClippingMagic
  const downloadProcessedImage = async (cmImageId: string) => {
    setIsDownloading(true);
    setError(null);

    try {
      // Download from ClippingMagic
      const response = await fetch(`/api/clippingmagic/download/${cmImageId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download processed image');
      }

      // Convert to blob
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      setProcessedUrl(dataUrl);

      // Save to our storage
      if (imageId) {
        const formData = new FormData();
        formData.append('image', blob, 'processed.png');
        formData.append('originalId', imageId);
        formData.append('type', 'background-removed');

        const saveResponse = await fetch('/api/uploads/processed', {
          method: 'POST',
          body: formData,
        });

        if (!saveResponse.ok) {
          console.error('Failed to save processed image');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  // Refund credit if user exits without completing
  const refundCredit = async () => {
    try {
      const response = await fetch('/api/credits/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credits: 1,
          reason: 'Background removal cancelled by user'
        }),
        credentials: 'include'
      });

      if (response.ok) {
        console.log('Credit refunded successfully');
        // You might want to update the UI or show a message
      }
    } catch (error) {
      console.error('Failed to refund credit:', error);
    }
  };

  // Open ClippingMagic editor
  const openEditor = (image: { id: number; secret: string }) => {
    if (!initialized) {
      setError('ClippingMagic not initialized');
      return;
    }

    console.log('Opening ClippingMagic editor with:', image);
    
    try {
      window.ClippingMagic.edit({
        image: {
          id: image.id,
          secret: image.secret
        },
        useStickySettings: true,
        hideBottomToolbar: false,
        locale: 'en-US'
      }, (opts: any) => {
        console.log('ClippingMagic callback:', opts);
        
        switch (opts.event) {
          case 'error':
            console.error('ClippingMagic error:', opts.error);
            setError(`Error: ${opts.error.message || 'Unknown error'}`);
            break;
            
          case 'result-generated':
            console.log('Result generated:', opts.image);
            // The user clicked "Done" in the editor
            setResultGenerated(true);
            
            // Deduct credit NOW when result is actually generated
            if (!creditsDeducted) {
              fetch('/api/credits/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credits: 1, operation: 'background-removal' }),
                credentials: 'include'
              }).then(async res => {
                if (res.ok) {
                  setCreditsDeducted(true);
                  console.log('Credit deducted for background removal');
                  // Refresh credits in auth store
                  const { refreshCredits } = useAuthStore.getState();
                  await refreshCredits();
                } else {
                  const error = await res.json();
                  console.error('Failed to deduct credit:', error);
                }
              }).catch(err => {
                console.error('Failed to deduct credit:', err);
              });
            }
            
            // Store the image ID and download it
            setProcessedImageId(opts.image.id.toString());
            // Automatically download the processed image
            downloadProcessedImage(opts.image.id.toString());
            break;
            
          case 'editor-exit':
            console.log('Editor closed');
            // No refund needed since we only deduct on completion
            break;
        }
      });
    } catch (err) {
      console.error('Failed to open editor:', err);
      setError('Failed to open editor');
    }
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
              { label: 'Background Removal' }
            ]} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="w-6 h-6 text-green-600" />
                Remove Background
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

                  {/* Action Button */}
                  {!uploadedImage && (
                    <>
                      {profile && profile.credits_remaining < 1 && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                          <p className="font-medium">Insufficient Credits</p>
                          <p className="text-xs mt-1">You need at least 1 credit to remove backgrounds. Please purchase more credits or upgrade your plan.</p>
                        </div>
                      )}
                      <Button
                        onClick={uploadToClippingMagic}
                        disabled={isLoading || !initialized || isUploading || !imageFile || (profile && profile.credits_remaining < 1)}
                        className="w-full"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Scissors className="w-5 h-5 mr-2" />
                            Remove Background
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  
                  {uploadedImage && !processedUrl && (
                    <div className="text-center">
                      <p className="text-green-600 mb-2">✓ Image uploaded successfully</p>
                      <p className="text-sm text-gray-600">The editor will open automatically...</p>
                      <Button
                        onClick={() => openEditor(uploadedImage)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Open Editor Manually
                      </Button>
                    </div>
                  )}

                  {/* Downloading Status */}
                  {isDownloading && (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p>Downloading processed image...</p>
                    </div>
                  )}

                  {/* Processed Result */}
                  {processedUrl && !isDownloading && processedUrl !== 'completed' && (
                    <div className="space-y-4">
                      <h3 className="font-medium mb-2">Processed Result</h3>
                      <div className="relative inline-block">
                        <img 
                          src={processedUrl} 
                          alt="Processed" 
                          className="max-w-full h-auto rounded-lg border"
                          style={{ 
                            maxHeight: '400px',
                            backgroundColor: '#f0f0f0',
                            backgroundImage: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)',
                            backgroundSize: '20px 20px'
                          }}
                        />
                      </div>
                      <div className="flex gap-4">
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = processedUrl;
                            link.download = 'background-removed.png';
                            link.click();
                          }}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Image
                        </Button>
                        <Button
                          onClick={() => openEditor(uploadedImage!)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Scissors className="w-4 h-4" />
                          Edit Again
                        </Button>
                      </div>
                      <p className="text-sm text-green-600">
                        ✓ Image processed and saved to your account
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Click "Remove Background" to upload your image</li>
                      <li>ClippingMagic editor will open in a popup window</li>
                      <li>Manually refine the background removal if needed</li>
                      <li>Click "Download" in the ClippingMagic editor to save your image</li>
                      <li>The download happens within the editor window</li>
                    </ol>
                    <p className="text-xs text-gray-500 mt-2">
                      Note: The editor opens in a popup window. Make sure popups are allowed.
                    </p>
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