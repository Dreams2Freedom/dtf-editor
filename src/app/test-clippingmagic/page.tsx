'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { env } from '@/config/env';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

export default function TestClippingMagic() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    id: number;
    secret: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Load script
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.onload = () => {
      console.log('Script loaded');
      setScriptLoaded(true);

      // Initialize
      if (window.ClippingMagic) {
        const errors = window.ClippingMagic.initialize({
          apiId: parseInt(env.CLIPPINGMAGIC_API_KEY),
        });
        console.log('Initialize errors:', errors);
        if (errors.length === 0) {
          setInitialized(true);
        } else {
          console.error('ClippingMagic initialization failed:', errors);
        }
      }
    };
    script.onerror = () => {
      console.error('Failed to load ClippingMagic script');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const uploadTestImage = async () => {
    setIsUploading(true);
    try {
      // Create a simple test image
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;

      // Draw a red circle on white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(100, 100, 50, 0, 2 * Math.PI);
      ctx.fill();

      // Convert to blob
      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(blob => resolve(blob!), 'image/png');
      });

      // Upload to ClippingMagic
      const formData = new FormData();
      formData.append('image', blob, 'test.png');

      const response = await fetch('/api/clippingmagic/upload-large', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success && result.image) {
        setUploadedImage(result.image);
      } else {
        alert('Upload failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const openEditor = () => {
    if (!initialized) {
      alert('ClippingMagic not initialized yet');
      return;
    }

    if (!uploadedImage) {
      alert('Please upload an image first');
      return;
    }

    console.log('Opening editor with image:', uploadedImage);

    // This should open in a popup window
    try {
      window.ClippingMagic.edit(
        {
          image: {
            id: uploadedImage.id,
            secret: uploadedImage.secret,
          },
          useStickySettings: true,
          hideBottomToolbar: false,
          locale: 'en-US',
        },
        (opts: any) => {
          console.log('ClippingMagic callback:', opts);

          switch (opts.event) {
            case 'error':
              console.error('ClippingMagic error:', opts.error);
              alert(`Error: ${opts.error.message || 'Unknown error'}`);
              break;

            case 'result-generated':
              console.log('Result generated:', opts.image);
              alert('Background removed successfully!');
              break;

            case 'editor-exit':
              console.log('Editor closed');
              break;

            default:
              console.log('Unknown event:', opts.event);
          }
        }
      );
    } catch (error) {
      console.error('Failed to open editor:', error);
      alert('Failed to open editor: ' + error.message);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        ClippingMagic White Label Editor Test
      </h1>

      <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded">
        <p className="font-semibold">Status:</p>
        <p>
          Script Loaded:{' '}
          <span className={scriptLoaded ? 'text-green-600' : 'text-red-600'}>
            {scriptLoaded ? 'Yes' : 'No'}
          </span>
        </p>
        <p>
          Initialized:{' '}
          <span className={initialized ? 'text-green-600' : 'text-red-600'}>
            {initialized ? 'Yes' : 'No'}
          </span>
        </p>
        <p>API ID: {env.CLIPPINGMAGIC_API_KEY}</p>
        {uploadedImage && (
          <p className="text-green-600">
            Image uploaded: ID {uploadedImage.id}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Button
          onClick={uploadTestImage}
          disabled={isUploading || !initialized}
          variant="outline"
          className="w-full"
        >
          {isUploading ? 'Uploading...' : 'Step 1: Upload Test Image'}
        </Button>

        <Button
          onClick={openEditor}
          disabled={!initialized || !uploadedImage}
          className="w-full"
        >
          Step 2: Open ClippingMagic Editor
        </Button>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="font-semibold text-yellow-800 mb-2">Important Notes:</p>
        <ul className="list-disc list-inside text-sm space-y-1 text-yellow-700">
          <li>
            The editor opens in a <strong>popup window</strong>, not an iframe
          </li>
          <li>You may need to allow popups for this site</li>
          <li>Check your browser's popup blocker if nothing happens</li>
          <li>The editor requires user interaction (click) to open</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="font-semibold text-blue-800 mb-2">How it works:</p>
        <ol className="list-decimal list-inside text-sm space-y-1 text-blue-700">
          <li>First, we upload a test image to ClippingMagic</li>
          <li>We get back an image ID and secret</li>
          <li>Then we can open the editor with that image</li>
          <li>The editor opens in a popup window</li>
          <li>Users can manually refine the background removal</li>
          <li>When done, we get a callback with the result</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm font-semibold mb-2">Browser Console:</p>
        <p className="text-xs text-gray-600">
          Open your browser's developer console to see detailed logs
        </p>
      </div>
    </div>
  );
}
