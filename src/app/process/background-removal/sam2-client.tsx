'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Scissors, Download, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SignupModal } from '@/components/auth/SignupModal';
import { BackgroundRemovalEditor } from '@/components/editor/BackgroundRemovalEditor';

/**
 * SAM2-based background removal client.
 * Replaces the ClippingMagic popup with an inline SAM2 editor.
 */
export default function SAM2BackgroundRemovalClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, refreshCredits, user } = useAuthStore();
  const imageId = searchParams.get('imageId');
  const imageUrlParam = searchParams.get('imageUrl');
  const tempImageKey = searchParams.get('tempImage');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedImageId, setProcessedImageId] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Load image data from either imageId, imageUrl, or tempImage
  useEffect(() => {
    const fetchImageFromUrl = async (url: string) => {
      try {
        setImageUrl(url);

        if (url.startsWith('data:')) {
          const matches = url.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) throw new Error('Invalid data URL format');

          const [, mimeType, base64Data] = matches;
          if (!mimeType.startsWith('image/'))
            throw new Error('Data URL is not an image');

          const byteString = atob(base64Data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeType });

          let extension = 'jpg';
          if (mimeType === 'image/png') extension = 'png';
          else if (mimeType === 'image/webp') extension = 'webp';
          else if (mimeType === 'image/gif') extension = 'gif';

          setImageFile(
            new File([blob], `image.${extension}`, { type: mimeType })
          );
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch image from URL');
          const blob = await res.blob();
          if (!blob.type.startsWith('image/'))
            throw new Error('URL does not point to a valid image');

          let extension = 'jpg';
          if (blob.type === 'image/png') extension = 'png';
          else if (blob.type === 'image/webp') extension = 'webp';
          else if (blob.type === 'image/gif') extension = 'gif';

          setImageFile(
            new File([blob], `image.${extension}`, { type: blob.type })
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load image from URL'
        );
      } finally {
        setIsLoading(false);
      }
    };

    const fetchImageFromDatabase = async () => {
      try {
        const response = await fetch(`/api/uploads/${imageId}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (data.success) {
          await fetchImageFromUrl(data.publicUrl);
        } else {
          throw new Error(data.error || 'Failed to load image');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setIsLoading(false);
      }
    };

    if (!imageId && !imageUrlParam && !tempImageKey) {
      router.push('/process');
      return;
    }

    if (tempImageKey) {
      try {
        const storedImage = sessionStorage.getItem(tempImageKey);
        if (storedImage) {
          sessionStorage.removeItem(tempImageKey);
          fetchImageFromUrl(storedImage);
          return;
        }
      } catch {
        // Fall through to other methods
      }
    }

    if (imageUrlParam) {
      fetchImageFromUrl(imageUrlParam);
    } else if (imageId) {
      fetchImageFromDatabase();
    }
  }, [imageId, imageUrlParam, tempImageKey, router]);

  // Refresh credits on load
  useEffect(() => {
    if (user) {
      refreshCredits();
      const handleFocus = () => refreshCredits();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [user, refreshCredits]);

  // Check authentication
  const handleStartEditor = () => {
    if (!user) {
      setShowSignupModal(true);
      return;
    }
    setShowEditor(true);
  };

  const handleEditorComplete = (result: {
    processedUrl: string;
    imageId: string;
  }) => {
    setProcessedUrl(result.processedUrl);
    setProcessedImageId(result.imageId);
    setShowEditor(false);
    refreshCredits();
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
  };

  const handleEditorError = (errMessage: string) => {
    setError(errMessage);
    setShowEditor(false);
  };

  const isPaidUser = ['basic', 'starter', 'professional'].includes(
    profile?.subscription_plan || ''
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8">
        <div className="max-w-5xl mx-auto p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: 'Process Image', href: '/process' },
                { label: 'Background Removal' },
              ]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="w-6 h-6 text-green-600" />
                Remove Background
                {isPaidUser && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-normal">
                    Unlimited
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Loading */}
              {isLoading && !imageUrl && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading image...</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Error</h3>
                      <div className="text-sm">{error}</div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setError(null);
                          setShowEditor(false);
                        }}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {imageUrl && !processedUrl && !showEditor && !error && (
                <div className="space-y-6">
                  {/* Credit warning for free users */}
                  {profile &&
                    !isPaidUser &&
                    profile.is_admin !== true &&
                    profile.credits_remaining < 1 && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm">
                        <p className="font-medium">Free Tier Limit</p>
                        <p className="text-xs mt-1">
                          Free accounts get 2 background removals per month.
                          Upgrade for unlimited access.
                        </p>
                      </div>
                    )}

                  {/* Original Image Preview */}
                  <div>
                    <h3 className="font-medium mb-2">Original Image</h3>
                    <img
                      src={imageUrl}
                      alt="Original"
                      className="max-w-full h-auto rounded-lg border"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>

                  {/* Start button */}
                  <Button
                    onClick={handleStartEditor}
                    className="w-full"
                    size="lg"
                  >
                    <Scissors className="w-5 h-5 mr-2" />
                    Remove Background
                  </Button>

                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>
                        Click &quot;Remove Background&quot; to start the AI
                        editor
                      </li>
                      <li>The AI will auto-detect the subject in your image</li>
                      <li>
                        Use green marks to keep areas, red marks to remove areas
                      </li>
                      <li>
                        Click &quot;Apply &amp; Save&quot; when you&apos;re
                        satisfied
                      </li>
                    </ol>
                    {isPaidUser && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        Paid plan: Unlimited background removals included
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SAM2 Editor (inline) */}
              {showEditor && imageUrl && (
                <BackgroundRemovalEditor
                  imageUrl={imageUrl}
                  imageFile={imageFile || undefined}
                  onComplete={handleEditorComplete}
                  onCancel={handleEditorCancel}
                  onError={handleEditorError}
                />
              )}

              {/* Processed Result */}
              {processedUrl && (
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
                        backgroundImage:
                          'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)',
                        backgroundSize: '20px 20px',
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = processedUrl;
                        link.download = 'background-removed.png';
                        link.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (processedImageId) {
                          router.push(
                            `/process/upscale?imageId=${processedImageId}`
                          );
                        } else {
                          router.push(
                            `/process/upscale?imageUrl=${encodeURIComponent(processedUrl)}`
                          );
                        }
                      }}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Upscale Image
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setProcessedUrl(null);
                        setProcessedImageId(null);
                        setShowEditor(true);
                      }}
                    >
                      <Scissors className="w-4 h-4 mr-2" />
                      Edit Again
                    </Button>
                  </div>
                  <p className="text-sm text-green-600">
                    Image processed and saved to your account
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        feature="AI background removal"
      />
    </div>
  );
}
