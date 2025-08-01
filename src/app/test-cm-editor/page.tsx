'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

export default function TestCMEditor() {
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
        // Use the numeric API ID (24469 based on your test page)
        const errors = window.ClippingMagic.initialize({ apiId: 24469 });
        
        if (errors.length === 0) {
          console.log('ClippingMagic initialized successfully');
          setInitialized(true);
          
          // Auto-open editor if we have image data
          if (imageId && imageSecret) {
            setTimeout(() => {
              openEditor();
            }, 500);
          }
        } else {
          console.error('ClippingMagic initialization errors:', errors);
          setError('Failed to initialize: ' + errors.join(', '));
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

  const openEditor = () => {
    if (!initialized || !imageId || !imageSecret) {
      console.error('Cannot open editor:', { initialized, imageId, imageSecret });
      return;
    }

    console.log('Opening ClippingMagic editor with:', { id: imageId, secret: imageSecret });
    
    try {
      window.ClippingMagic.edit({
        image: {
          id: parseInt(imageId),
          secret: imageSecret
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
            // Here you could download the result or notify the parent window
            alert('Background removed successfully! Image ID: ' + opts.image.id);
            break;
            
          case 'editor-exit':
            console.log('Editor closed');
            // Could close this window or redirect
            break;
        }
      });
    } catch (err) {
      console.error('Failed to open editor:', err);
      setError('Failed to open editor: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ClippingMagic Editor</h1>
      
      <div className="space-y-4">
        {/* Status */}
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Status</h2>
          <p>Script loaded: {scriptLoaded ? '✓ Yes' : '✗ No'}</p>
          <p>Initialized: {initialized ? '✓ Yes' : '✗ No'}</p>
          <p>Image ID: {imageId || 'None'}</p>
          <p>Image Secret: {imageSecret ? imageSecret.substring(0, 10) + '...' : 'None'}</p>
        </div>

        {/* Manual Open Button */}
        {imageId && imageSecret && (
          <button
            onClick={openEditor}
            disabled={!initialized}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Open Editor Manually
          </button>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="border rounded p-4 bg-yellow-50">
          <h2 className="font-semibold mb-2">Note</h2>
          <p className="text-sm">
            The ClippingMagic editor opens in a popup window. Make sure popups are allowed for this site.
          </p>
          <p className="text-sm mt-2">
            If nothing happens, check your browser console for errors and ensure popups are not blocked.
          </p>
        </div>
      </div>
    </div>
  );
}