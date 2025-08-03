'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { env } from '@/config/env';

declare global {
  interface Window {
    cmImageData?: {
      id: number;
      secret: string;
    };
    ClippingMagic?: any;
  }
}

export default function ClippingMagicEditorClient() {
  const searchParams = useSearchParams();
  const imageId = searchParams.get('id');
  const imageSecret = searchParams.get('secret');

  useEffect(() => {
    if (!imageId || !imageSecret) {
      console.error('Missing image ID or secret');
      return;
    }

    // Store values on window for the script to access
    window.cmImageData = {
      id: parseInt(imageId),
      secret: imageSecret
    };

    // Load ClippingMagic SDK
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.async = true;
    
    script.onload = () => {
      console.log('ClippingMagic script loaded');
      initializeEditor();
    };

    script.onerror = () => {
      console.error('Failed to load ClippingMagic SDK');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete window.cmImageData;
    };
  }, [imageId, imageSecret]);

  const initializeEditor = () => {
    if (!window.ClippingMagic || !window.cmImageData) {
      console.error('ClippingMagic not loaded or image data missing');
      return;
    }

    try {
      const editor = new window.ClippingMagic({
        apiId: parseInt(env.NEXT_PUBLIC_CLIPPING_MAGIC_API_ID || '12345'),
        image: {
          id: window.cmImageData.id,
          secret: window.cmImageData.secret
        },
        locale: 'en-US',
        publicKey: env.NEXT_PUBLIC_CLIPPING_MAGIC_PUBLIC_KEY
      });

      editor.subscribe({
        onEvent: (errors: any, image: any) => {
          if (errors) {
            console.error('ClippingMagic errors:', errors);
            return;
          }
          
          if (image && image.resultUrl) {
            console.log('Image processed:', image);
            // Here you could redirect back to your app with the result
            // window.location.href = `/process/complete?url=${encodeURIComponent(image.resultUrl)}`;
          }
        }
      });

      console.log('ClippingMagic editor initialized');
    } catch (error) {
      console.error('Failed to initialize ClippingMagic editor:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div id="clippingmagic-editor" className="w-full h-screen">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Loading ClippingMagic Editor...</h2>
            <p className="text-gray-600">This may take a few seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
}