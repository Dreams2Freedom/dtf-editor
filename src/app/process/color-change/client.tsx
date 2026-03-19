'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Palette, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SignupModal } from '@/components/auth/SignupModal';
import { ColorChangeEditor } from '@/components/image/ColorChangeEditor';
import { COLOR_CHANGE_LIMITS } from '@/types/colorChange';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export default function ColorChangeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile: _profile, user: _user } = useAuthStore();
  const imageId = searchParams.get('imageId');
  const imageUrlParam = searchParams.get('imageUrl');

  const [_imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(5);
  const [usageLimit, setUsageLimit] = useState(5);
  const [savedImageId, setSavedImageId] = useState<string | null>(null);
  const [lowQualityWarning, setLowQualityWarning] = useState(false);
  const [imageDpi, setImageDpi] = useState<number | null>(null);

  // Load image
  useEffect(() => {
    if (!imageId && !imageUrlParam) {
      router.push('/process');
      return;
    }

    const loadImage = async () => {
      try {
        let url: string;
        if (imageUrlParam) {
          url = imageUrlParam;
        } else if (imageId) {
          const response = await fetch(`/api/uploads/${imageId}`, { credentials: 'include' });
          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Failed to load image');
          url = data.publicUrl;
        } else {
          throw new Error('No image specified');
        }

        setImageUrl(url);

        // Load into HTMLImageElement
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImageElement(img);
          setIsLoading(false);
          // Check DPI: assume 10" wide print, need 300 DPI = 3000px wide
          const dpiAt10Inches = Math.round(img.width / 10);
          setImageDpi(dpiAt10Inches);
          if (dpiAt10Inches < 300) {
            setLowQualityWarning(true);
          }
        };
        img.onerror = () => {
          setError('Failed to load image');
          setIsLoading(false);
        };
        img.src = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageId, imageUrlParam, router]);

  // Fetch usage info
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const supabase = createClientSupabaseClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', authUser.id)
          .single();

        if (data) {
          const tier = data.subscription_status || 'free';
          const limit = COLOR_CHANGE_LIMITS[tier] ?? COLOR_CHANGE_LIMITS.free;
          setUsageLimit(limit);
          setUsageRemaining(limit); // Default to full allocation until DB column exists
        }
      } catch {
        // Use defaults
      }
    };
    fetchUsage();
  }, []);

  const handleSave = useCallback(async (canvas: HTMLCanvasElement) => {
    // Check usage (gracefully handle missing API/DB column)
    let useResult = { allowed: true, remaining: usageRemaining, creditCharged: false };
    try {
      const useResponse = await fetch('/api/color-change/use', {
        method: 'POST',
        credentials: 'include',
      });
      if (useResponse.ok) {
        useResult = await useResponse.json();
      }
      // If 404 or other error, allow the save (usage tracking not set up yet)
    } catch {
      // Network error — allow save
    }

    if (!useResult.allowed) {
      throw new Error('You have used all free color changes and have no credits. Purchase credits or upgrade your plan.');
    }

    // Export canvas as blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to export')), 'image/png');
    });

    // Save via /api/process
    const formData = new FormData();
    formData.append('image', blob, 'color-changed.png');
    formData.append('operation', 'color-change');

    const response = await fetch('/api/process', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save');
    }

    const result = await response.json();
    setSavedImageId(result.metadata?.savedId || null);

    // Update usage display
    setUsageRemaining(useResult.remaining);

    // DPI check
    const minDpi = Math.min(canvas.width / 4, canvas.height / 4);
    if (minDpi < 150) {
      alert('This image may be too low resolution for quality DTF printing. Consider upscaling it.');
    }
  }, []);

  const handleCancel = useCallback(() => {
    router.push('/process');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-4">
        <div className="max-w-6xl mx-auto p-4 space-y-4">
          <Breadcrumb
            items={[
              { label: 'Process Image', href: '/process' },
              { label: 'Color Change' },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-6 h-6 text-amber-600" />
                Change Colors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading image...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                  {error}
                </div>
              )}

              {lowQualityWarning && imageElement && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 mb-4">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Low resolution image ({imageDpi} DPI at 10&quot; wide)
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      For best print quality, this image should be at least 3000px wide (300 DPI at 10&quot;).
                      Color changes will work, but you&apos;ll get better results if you{' '}
                      <a
                        href={imageId ? `/process/upscale?imageId=${imageId}` : '/process/upscale'}
                        className="font-medium underline hover:text-amber-900"
                      >
                        upscale the image first
                      </a>.
                    </p>
                    <button
                      onClick={() => setLowQualityWarning(false)}
                      className="text-xs text-amber-600 hover:text-amber-800 mt-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {imageElement && !error && (
                <div className="h-[calc(100vh-200px)] min-h-[500px]">
                  <ColorChangeEditor
                    image={imageElement}
                    usageRemaining={usageRemaining}
                    usageLimit={usageLimit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    savedImageId={savedImageId}
                    onNavigate={(path) => router.push(path)}
                  />
                </div>
              )}

              {savedImageId && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <span className="text-green-800 text-sm font-medium">Saved to gallery!</span>
                  <a href="/dashboard#my-images" className="text-sm text-green-700 underline">View in Gallery</a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        feature="color change tool"
      />
    </div>
  );
}
