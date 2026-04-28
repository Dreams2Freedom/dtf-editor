'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, Loader2, Palette, Scissors } from 'lucide-react';

import { BackgroundRemovalPanel } from '@/tools/bg-removal';
import { ColorChangeEditor } from '@/components/image/ColorChangeEditor';
import { SignupModal } from '@/components/auth/SignupModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { COLOR_CHANGE_LIMITS } from '@/types/colorChange';

type StudioTool = 'bg' | 'color';

const TOOL_CONFIG: Record<StudioTool, { label: string; icon: React.FC<{ className?: string }> }> = {
  bg: { label: 'Background Removal', icon: Scissors },
  color: { label: 'Color Changer', icon: Palette },
};

export default function StudioClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const imageId = searchParams.get('imageId');
  const imageUrlParam = searchParams.get('imageUrl');
  const toolParam = (searchParams.get('tool') as StudioTool) || 'bg';

  const [activeTool, setActiveTool] = useState<StudioTool>(toolParam);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lowQualityWarning, setLowQualityWarning] = useState(false);
  const [imageDpi, setImageDpi] = useState<number | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [savedImageId, setSavedImageId] = useState<string | null>(null);

  // Color-change specific state
  const [usageRemaining, setUsageRemaining] = useState(5);
  const [usageLimit, setUsageLimit] = useState(5);

  useEffect(() => {
    if (!imageId && !imageUrlParam) {
      router.push('/process');
      return;
    }

    const load = async () => {
      try {
        let url: string;
        if (imageUrlParam) {
          url = imageUrlParam;
        } else {
          const res = await fetch(`/api/uploads/${imageId}`, { credentials: 'include' });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to load image');
          url = data.publicUrl;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImageElement(img);
          setIsLoading(false);
          const dpi = Math.round(img.width / 10);
          setImageDpi(dpi);
          if (dpi < 300) setLowQualityWarning(true);
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

    load();
  }, [imageId, imageUrlParam, router]);

  // Fetch color-change usage limits
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const supabase = createClientSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();
        if (data) {
          const tier = data.subscription_status || 'free';
          const limit = COLOR_CHANGE_LIMITS[tier] ?? COLOR_CHANGE_LIMITS.free;
          setUsageLimit(limit);
          setUsageRemaining(limit);
        }
      } catch {
        /* use defaults */
      }
    };
    fetchLimits();
  }, []);

  const switchTool = useCallback(
    (tool: StudioTool) => {
      setActiveTool(tool);
      setSavedImageId(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tool', tool);
      router.replace(`/studio?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Save handler for BG removal
  const handleBgSave = useCallback(
    async (canvas: HTMLCanvasElement, provider: 'in-house') => {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png')
      );

      const form = new FormData();
      form.append('image', blob, 'bg-removed.png');
      form.append('operation', 'background-removal');
      form.append('provider', provider);

      const res = await fetch('/api/process', { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      const result = await res.json();
      setSavedImageId(result.metadata?.savedId || null);
    },
    []
  );

  // Save handler for color change (mirrors original client.tsx logic)
  const handleColorSave = useCallback(
    async (canvas: HTMLCanvasElement) => {
      let useResult = { allowed: true, remaining: usageRemaining, creditCharged: false };
      try {
        const r = await fetch('/api/color-change/use', { method: 'POST', credentials: 'include' });
        if (r.ok) useResult = await r.json();
      } catch {
        /* allow */
      }
      if (!useResult.allowed) {
        throw new Error('No color changes remaining. Purchase credits or upgrade your plan.');
      }

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png')
      );
      const form = new FormData();
      form.append('image', blob, 'color-changed.png');
      form.append('operation', 'color-change');

      const res = await fetch('/api/process', { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      const result = await res.json();
      setSavedImageId(result.metadata?.savedId || null);
      setUsageRemaining(useResult.remaining);
    },
    [usageRemaining]
  );

  const advancedBgUrl = imageId
    ? `/process/background-removal?imageId=${imageId}`
    : imageUrlParam
      ? `/process/background-removal?imageUrl=${encodeURIComponent(imageUrlParam)}`
      : '/process/background-removal';

  return (
    <div className="flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <Breadcrumb items={[{ label: 'Process', href: '/process' }, { label: 'Studio' }]} />

          {/* Tool switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.entries(TOOL_CONFIG) as [StudioTool, typeof TOOL_CONFIG[StudioTool]][]).map(
              ([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => switchTool(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTool === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* DPI warning */}
      {lowQualityWarning && imageElement && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              Low resolution ({imageDpi} DPI at 10&quot; wide).{' '}
              <a
                href={imageId ? `/process/upscale?imageId=${imageId}` : '/process/upscale'}
                className="font-medium underline hover:text-amber-900 inline-flex items-center gap-0.5"
              >
                Upscale first <ArrowUpRight className="w-3 h-3" />
              </a>{' '}
              for best print quality.
            </p>
            <button
              onClick={() => setLowQualityWarning(false)}
              className="text-xs text-amber-600 hover:text-amber-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading image...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl text-center">
              <p className="font-medium mb-2">Failed to load image</p>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => router.push('/process')}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm transition-colors"
              >
                Back to Process
              </button>
            </div>
          </div>
        )}

        {imageElement && !error && (
          <>
            {activeTool === 'bg' && (
              <BackgroundRemovalPanel
                image={imageElement}
                onSave={handleBgSave}
                onCancel={() => router.push('/process')}
                savedImageId={savedImageId}
                advancedBgUrl={advancedBgUrl}
              />
            )}

            {activeTool === 'color' && (
              <ColorChangeEditor
                image={imageElement}
                usageRemaining={usageRemaining}
                usageLimit={usageLimit}
                onSave={handleColorSave}
                onCancel={() => router.push('/process')}
                savedImageId={savedImageId}
                onNavigate={path => router.push(path)}
              />
            )}
          </>
        )}
      </div>

      {/* Saved toast */}
      {savedImageId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-green-500/25 flex items-center gap-2 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Saved to gallery
          <a href="/dashboard#my-images" className="underline ml-1 opacity-80 hover:opacity-100">
            View
          </a>
        </div>
      )}

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        feature="Studio tools"
      />
    </div>
  );
}
