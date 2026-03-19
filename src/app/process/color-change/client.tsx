'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Palette, Loader2, AlertTriangle, ArrowUpRight } from 'lucide-react';
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

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImageElement(img);
          setIsLoading(false);
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
          setUsageRemaining(limit);
        }
      } catch {
        // Use defaults
      }
    };
    fetchUsage();
  }, []);

  const handleSave = useCallback(async (canvas: HTMLCanvasElement) => {
    let useResult = { allowed: true, remaining: usageRemaining, creditCharged: false };
    try {
      const useResponse = await fetch('/api/color-change/use', {
        method: 'POST',
        credentials: 'include',
      });
      if (useResponse.ok) {
        useResult = await useResponse.json();
      }
    } catch {
      // Allow save
    }

    if (!useResult.allowed) {
      throw new Error('You have used all free color changes and have no credits. Purchase credits or upgrade your plan.');
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to export')), 'image/png');
    });

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
    setUsageRemaining(useResult.remaining);
  }, [usageRemaining]);

  const handleCancel = useCallback(() => {
    router.push('/process');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Compact header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2.5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Breadcrumb
              items={[
                { label: 'Process', href: '/process' },
                { label: 'Color Change' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-gray-300">Color Changer</span>
          </div>
        </div>
      </div>

      {/* DPI Warning */}
      {lowQualityWarning && imageElement && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-200 flex-1">
              Low resolution ({imageDpi} DPI at 10&quot; wide). For best print quality,{' '}
              <a
                href={imageId ? `/process/upscale?imageId=${imageId}` : '/process/upscale'}
                className="font-medium underline hover:text-amber-100 inline-flex items-center gap-0.5"
              >
                upscale first <ArrowUpRight className="w-3 h-3" />
              </a>
            </p>
            <button
              onClick={() => setLowQualityWarning(false)}
              className="text-xs text-amber-400/60 hover:text-amber-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading image...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 text-red-300 p-6 rounded-xl text-center">
              <p className="font-medium mb-2">Failed to load image</p>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => router.push('/process')}
                className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
              >
                Back to Process
              </button>
            </div>
          </div>
        )}

        {imageElement && !error && (
          <ColorChangeEditor
            image={imageElement}
            usageRemaining={usageRemaining}
            usageLimit={usageLimit}
            onSave={handleSave}
            onCancel={handleCancel}
            savedImageId={savedImageId}
            onNavigate={(path) => router.push(path)}
          />
        )}
      </div>

      {/* Saved toast */}
      {savedImageId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-green-500/25 flex items-center gap-2 text-sm font-medium animate-[slideUp_0.3s_ease-out]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Saved to gallery
          <a href="/dashboard#my-images" className="underline ml-1 opacity-80 hover:opacity-100">View</a>
        </div>
      )}

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        feature="color change tool"
      />
    </div>
  );
}
