'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { env } from '@/config/env';

export default function ClippingMagicEditor() {
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

    // Inline script to initialize ClippingMagic
    const scriptContent = `
      window.cmCallback = function(opts) {
        console.log('ClippingMagic callback:', opts);
        switch (opts.event) {
          case "error":
            alert("An error occurred: " + opts.error.status + ", " + opts.error.code + ", " + opts.error.message);
            break;
          case "result-generated":
            console.log("Generated a result for " + opts.image.id);
            // Send message back to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'clippingmagic-complete',
                imageId: opts.image.id
              }, window.location.origin);
            }
            break;
          case "editor-exit":
            console.log("Editor closed");
            if (window.opener) {
              window.opener.postMessage({
                type: 'clippingmagic-closed'
              }, window.location.origin);
            }
            window.close();
            break;
        }
      };
      
      window.addEventListener('load', function() {
        if (typeof window.ClippingMagic !== 'undefined') {
          var errorsArray = window.ClippingMagic.initialize({apiId: ${parseInt(env.CLIPPINGMAGIC_API_KEY)}});
          if (errorsArray.length > 0) {
            alert("Sorry, your browser is missing some required features: \\n\\n " + errorsArray.join("\\n "));
          } else {
            console.log('ClippingMagic initialized successfully');
            
            // Open editor after a short delay
            setTimeout(function() {
              console.log('Attempting to open ClippingMagic editor...');
              console.log('Image data:', window.cmImageData);
              
              if (window.ClippingMagic && window.ClippingMagic.edit && window.cmImageData) {
                try {
                  window.ClippingMagic.edit({
                    image: { 
                      id: window.cmImageData.id, 
                      secret: window.cmImageData.secret
                    },
                    useStickySettings: true,
                    hideBottomToolbar: false,
                    locale: 'en-US'
                  }, window.cmCallback);
                  console.log('ClippingMagic.edit() called successfully');
                } catch (e) {
                  console.error('Error calling ClippingMagic.edit:', e);
                  alert('Error opening editor: ' + e);
                }
              } else {
                console.error('ClippingMagic.edit not available or missing image data');
                alert('ClippingMagic editor not loaded or missing image data. Please refresh the page.');
              }
            }, 1000);
          }
        }
      });
    `;

    const script = document.createElement('script');
    script.innerHTML = scriptContent;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, [imageId, imageSecret]);

  const openEditor = () => {
    console.log('Manual open button clicked');
    if (window.ClippingMagic && window.ClippingMagic.edit && window.cmImageData) {
      try {
        window.ClippingMagic.edit({
          image: { 
            id: window.cmImageData.id, 
            secret: window.cmImageData.secret
          },
          useStickySettings: true,
          hideBottomToolbar: false,
          locale: 'en-US'
        }, window.cmCallback);
        console.log('ClippingMagic.edit() called from button');
      } catch (e) {
        console.error('Error:', e);
        alert('Error opening editor: ' + e);
      }
    } else {
      alert('Editor not ready or missing image data');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">ClippingMagic Editor</h1>
        <p className="text-gray-600 mb-4">Loading editor...</p>
        
        <button
          onClick={openEditor}
          className="mb-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Editor Manually
        </button>
        
        <p className="text-sm text-gray-500">
          If the editor doesn't open automatically, click the button above or check that popups are allowed.
        </p>
        
        {imageId && imageSecret && (
          <div className="mt-4 text-xs text-gray-400">
            <p>Image ID: {imageId}</p>
            <p>Secret: {imageSecret.substring(0, 10)}...</p>
          </div>
        )}
      </div>
      
      <script src="https://clippingmagic.com/api/v1/ClippingMagic.js" type="text/javascript" />
    </div>
  );
}

declare global {
  interface Window {
    ClippingMagic: any;
    cmCallback: (opts: any) => void;
    cmImageData?: {
      id: number;
      secret: string;
    };
  }
}