'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

export default function TestCMEditorClient() {
  const searchParams = useSearchParams();
  const imageId = searchParams.get('id');
  const imageSecret = searchParams.get('secret');

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load ClippingMagic script
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.async = true;

    script.onload = () => {
      console.log('ClippingMagic script loaded');
      setScriptLoaded(true);

      // Initialize ClippingMagic
      if (window.ClippingMagic) {
        try {
          const clippingMagic = new window.ClippingMagic({
            apiId: parseInt(
              process.env.NEXT_PUBLIC_CLIPPING_MAGIC_API_ID || '12345'
            ),
            locale: 'en-US',
          });

          console.log('ClippingMagic initialized');
          setInitialized(true);
        } catch (err) {
          console.error('Failed to initialize ClippingMagic:', err);
          setError('Failed to initialize editor');
        }
      }
    };

    script.onerror = () => {
      console.error('Failed to load ClippingMagic script');
      setError('Failed to load ClippingMagic SDK');
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ClippingMagic Editor Test</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="w-32">Script Loaded:</span>
              <span
                className={scriptLoaded ? 'text-green-600' : 'text-gray-400'}
              >
                {scriptLoaded ? '✓ Loaded' : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-32">Initialized:</span>
              <span
                className={initialized ? 'text-green-600' : 'text-gray-400'}
              >
                {initialized ? '✓ Ready' : 'Not initialized'}
              </span>
            </div>
            {error && <div className="text-red-600 mt-2">Error: {error}</div>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Parameters</h2>
          <div className="space-y-2">
            <div>Image ID: {imageId || 'Not provided'}</div>
            <div>Image Secret: {imageSecret || 'Not provided'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Editor Container</h2>
          <div
            id="clippingmagic-editor"
            className="min-h-[400px] border border-gray-200 rounded"
          >
            {!initialized && (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                {error ? error : 'Initializing editor...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
