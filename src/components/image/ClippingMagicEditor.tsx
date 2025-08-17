'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { env } from '@/config/env';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

interface ClippingMagicEditorProps {
  imageFile: File;
  onComplete: (processedImageUrl: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function ClippingMagicEditor({ 
  imageFile, 
  onComplete, 
  onError,
  onCancel 
}: ClippingMagicEditorProps) {
  const [isUploading, setIsUploading] = useState(true);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [imageData, setImageData] = useState<{ id: string; secret: string } | null>(null);
  const scriptLoadedRef = useRef(false);
  const editorOpenRef = useRef(false);

  // Load ClippingMagic script
  useEffect(() => {
    if (scriptLoadedRef.current) {
      // Script already loaded, just check if ClippingMagic is available
      if (window.ClippingMagic) {
        setIsEditorReady(true);
      }
      return;
    }
    
    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src="https://clippingmagic.com/api/v1/ClippingMagic.js"]');
    if (existingScript) {
      scriptLoadedRef.current = true;
      if (window.ClippingMagic) {
        setIsEditorReady(true);
      }
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      console.log('ClippingMagic script loaded');
      scriptLoadedRef.current = true;
      
      if (!window.ClippingMagic) {
        onError('ClippingMagic library not found');
        return;
      }
      
      const errors = window.ClippingMagic.initialize({ 
        apiId: parseInt(env.CLIPPINGMAGIC_API_KEY) 
      });
      
      console.log('ClippingMagic initialization errors:', errors);
      
      if (errors.length === 0) {
        setIsEditorReady(true);
      } else {
        onError('Browser missing required features: ' + errors.join(', '));
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load ClippingMagic script');
      onError('Failed to load ClippingMagic editor');
    };
    
    document.body.appendChild(script);
  }, [onError]);

  // Upload image when component mounts
  useEffect(() => {
    uploadImage();
  }, []);

  const uploadImage = async () => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/clippingmagic/upload-large', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      // Extract the image data from the response
      if (data.success && data.image) {
        setImageData({ id: data.image.id.toString(), secret: data.image.secret });
      } else {
        throw new Error('Invalid response format');
      }
      
      setIsUploading(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to upload image');
      setIsUploading(false);
    }
  };

  const openEditor = () => {
    if (!isEditorReady || !imageData) return;
    
    // Prevent opening multiple editors
    if (editorOpenRef.current) {
      console.log('Editor already open');
      return;
    }

    try {
      console.log('Opening ClippingMagic editor with:', { id: imageData.id });
      editorOpenRef.current = true;
      
      // The ClippingMagic.edit function opens the editor in a popup window
      window.ClippingMagic.edit({
        image: { 
          id: parseInt(imageData.id), 
          secret: imageData.secret 
        },
        useStickySettings: true,
        hideBottomToolbar: false,
        locale: 'en-US'
      }, (opts: any) => {
        console.log('ClippingMagic callback:', opts);
        
        switch (opts.event) {
          case 'error':
            console.error('ClippingMagic error:', opts.error);
            editorOpenRef.current = false;
            onError(`ClippingMagic error: ${opts.error.message}`);
            break;
            
          case 'result-generated':
            console.log('Result generated:', opts.image);
            editorOpenRef.current = false;
            // Result is ready, download it
            downloadResult(opts.image.id);
            break;
            
          case 'editor-exit':
            console.log('Editor closed');
            editorOpenRef.current = false;
            // User closed editor without saving
            onCancel();
            break;
        }
      });
    } catch (error) {
      console.error('Failed to open ClippingMagic editor:', error);
      editorOpenRef.current = false;
      onError('Failed to open the background removal editor. Please try again.');
    }
  };

  const downloadResult = async (imageId: string) => {
    try {
      const response = await fetch(`/api/clippingmagic/download/${imageId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download result');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      onComplete(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to download result');
    }
  };

  // Remove auto-open to prevent duplicate calls
  // User must click the button to open editor

  if (isUploading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Uploading image...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-gray-600 mb-4">
        Click the button below to open the background removal editor
      </p>
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mb-4">
          <p>Editor Ready: {isEditorReady ? 'Yes' : 'No'}</p>
          <p>Image ID: {imageData?.id || 'Not uploaded'}</p>
          <p>API ID: {env.CLIPPINGMAGIC_API_KEY}</p>
        </div>
      )}
      
      <div className="flex justify-center space-x-4">
        <Button
          onClick={openEditor}
          disabled={!isEditorReady || !imageData}
        >
          Open Background Removal Editor
        </Button>
        <Button
          onClick={onCancel}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>
      
      <p className="text-xs text-gray-500 mt-4">
        Note: The editor will open in a popup window. Please allow popups for this site.
      </p>
    </div>
  );
}