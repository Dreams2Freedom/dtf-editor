'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAsyncJob } from '@/hooks/useAsyncJob';
import { useSearchParams, useRouter } from 'next/navigation';
import { Wand2, Download, Loader2, ArrowLeft, Scissors, Calculator, Lock, Unlock, Info, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SignupModal } from '@/components/auth/SignupModal';
import { getImageDimensions } from '@/utils/dpiCalculator';
import { compressImage, urlToFile, needsCompression } from '@/utils/imageCompression';

export default function UpscaleClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, refreshCredits, user } = useAuthStore();
  const imageId = searchParams.get('imageId');
  const imageUrlParam = searchParams.get('imageUrl');
  const printWidthParam = searchParams.get('printWidth');
  const printHeightParam = searchParams.get('printHeight');

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Async job polling hook
  const {
    startPolling,
    stopPolling,
    cancelJob,
    jobStatus,
    isPolling
  } = useAsyncJob({
    onComplete: (result) => {
      console.log('[Upscale] Async processing complete:', result);
      setProcessedUrl(result.url);
      setProcessedImageId(result.imageId);
      setIsProcessing(false);
      setIsAsyncProcessing(false);
      setProcessingProgress(100);
    },
    onError: (error) => {
      console.error('[Upscale] Async processing error:', error);
      setError(error);
      setIsProcessing(false);
      setIsAsyncProcessing(false);
    },
    onProgress: (progress) => {
      setProcessingProgress(progress);
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedImageId, setProcessedImageId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isAsyncProcessing, setIsAsyncProcessing] = useState(false);
  const [selectedScale, setSelectedScale] = useState('2');
  const [showEnhancements, setShowEnhancements] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
  // DPI Mode states - Smart DPI mode is now default
  const [mode, setMode] = useState<'simple' | 'dpi'>('dpi');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [printWidth, setPrintWidth] = useState<string>('');
  const [printHeight, setPrintHeight] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [targetDPI] = useState(300); // Fixed at 300 DPI for professional quality

  // Handle width change and auto-calculate height if maintaining aspect ratio
  const handleWidthChange = useCallback((value: string) => {
    setPrintWidth(value);
    
    if (maintainAspectRatio && aspectRatio && value) {
      const width = parseFloat(value);
      if (!isNaN(width) && width > 0) {
        const calculatedHeight = width / aspectRatio;
        setPrintHeight(calculatedHeight.toFixed(2));
      }
    }
  }, [maintainAspectRatio, aspectRatio]);

  // Handle height change and auto-calculate width if maintaining aspect ratio
  const handleHeightChange = useCallback((value: string) => {
    setPrintHeight(value);
    
    if (maintainAspectRatio && aspectRatio && value) {
      const height = parseFloat(value);
      if (!isNaN(height) && height > 0) {
        const calculatedWidth = height * aspectRatio;
        setPrintWidth(calculatedWidth.toFixed(2));
      }
    }
  }, [maintainAspectRatio, aspectRatio]);

  // Detect image dimensions when URL changes
  const detectImageDimensions = useCallback(async (url: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      const dimensions = { width: img.width, height: img.height };
      setImageDimensions(dimensions);
      
      // Calculate aspect ratio
      const ratio = dimensions.width / dimensions.height;
      setAspectRatio(ratio);

      // Set default print dimensions - minimum 10 inches wide for realistic print sizes
      // This shows users the actual DPI quality at common print sizes
      const currentWidthAt300DPI = dimensions.width / targetDPI;

      // Use 10 inches minimum width, or larger if the image supports it
      const defaultWidth = Math.max(10, currentWidthAt300DPI);
      const defaultHeight = defaultWidth / ratio; // Maintain aspect ratio

      setPrintWidth(defaultWidth.toFixed(2));
      setPrintHeight(defaultHeight.toFixed(2));

      // Log the actual DPI at the default print size
      const actualDPI = Math.min(
        dimensions.width / defaultWidth,
        dimensions.height / defaultHeight
      );

      console.log('Image dimensions detected:', dimensions);
      console.log(`Default print size set to ${defaultWidth.toFixed(2)}" × ${defaultHeight.toFixed(2)}"`);
      console.log(`Image quality at this size: ${Math.round(actualDPI)} DPI (300 DPI recommended for print)`);
    } catch (error) {
      console.error('Failed to detect image dimensions:', error);
    }
  }, [targetDPI]);

  // Calculate required upscale factor for DPI mode
  const calculateUpscaleFactor = useCallback(() => {
    if (!imageDimensions || !printWidth || !printHeight) return null;
    
    const width = parseFloat(printWidth);
    const height = parseFloat(printHeight);
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) return null;
    
    // Calculate required pixels for 300 DPI
    let requiredWidth = Math.round(width * targetDPI);
    let requiredHeight = Math.round(height * targetDPI);
    
    // Calculate scale factors
    const scaleX = requiredWidth / imageDimensions.width;
    const scaleY = requiredHeight / imageDimensions.height;
    
    // Use the maximum scale to ensure both dimensions meet 300 DPI
    let scale = Math.max(scaleX, scaleY);
    
    // IMPORTANT: Limit extreme dimensions to prevent timeouts
    // Use conservative limits to ensure reliability
    const maxDimension = 6000; // Maximum 6000px per side (reduced from 8000)
    const maxMegapixels = 30; // Maximum 30 megapixels (reduced from 50)
    let limitedByMax = false;
    
    if (requiredWidth > maxDimension || requiredHeight > maxDimension) {
      // Only log once when actually processing, not on every render
      const limitScale = Math.min(maxDimension / imageDimensions.width, maxDimension / imageDimensions.height);
      scale = Math.min(scale, limitScale);
      requiredWidth = Math.min(requiredWidth, maxDimension);
      requiredHeight = Math.min(requiredHeight, maxDimension);
      limitedByMax = true;
    }
    
    // Check megapixels
    let megapixels = (requiredWidth * requiredHeight) / 1000000;
    if (megapixels > maxMegapixels) {
      // Only log once when actually processing, not on every render
      const mpScale = Math.sqrt(maxMegapixels / megapixels);
      scale = scale * mpScale;
      requiredWidth = Math.round(requiredWidth * mpScale);
      requiredHeight = Math.round(requiredHeight * mpScale);
      megapixels = (requiredWidth * requiredHeight) / 1000000; // Recalculate after adjustment
      limitedByMax = true;
    }
    
    return {
      scale,
      requiredWidth,
      requiredHeight,
      currentDPI: Math.round(Math.min(
        imageDimensions.width / width,
        imageDimensions.height / height
      )),
      limitedByMax
    };
  }, [imageDimensions, printWidth, printHeight, targetDPI]);

  // Load image data
  useEffect(() => {
    // Check if coming from DPI tool - check both URL param and localStorage flag
    const fromDpiTool = searchParams.get('fromDpiTool') === 'true' || localStorage.getItem('dpi_tool_redirect') === 'true';
    
    if (fromDpiTool) {
      // Check localStorage first (more persistent)
      const storedImage = localStorage.getItem('dpi_tool_image') || sessionStorage.getItem('dpi_tool_image');
      const storedFilename = localStorage.getItem('dpi_tool_filename') || sessionStorage.getItem('dpi_tool_filename');
      const storedPrintWidth = localStorage.getItem('dpi_tool_printWidth') || sessionStorage.getItem('dpi_tool_printWidth');
      const storedPrintHeight = localStorage.getItem('dpi_tool_printHeight') || sessionStorage.getItem('dpi_tool_printHeight');
      
      // Clear the redirect flag
      localStorage.removeItem('dpi_tool_redirect');
      
      if (storedImage) {
        // Set loading state
        setIsLoading(true);
        
        // Function to handle the upload
        const handleUpload = async () => {
          try {
            // Convert data URL to blob without using fetch (CSP issue)
            let blob;
            if (storedImage.startsWith('data:')) {
              // Extract the base64 data
              const base64Data = storedImage.split(',')[1];
              const mimeType = storedImage.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
              
              // Convert base64 to binary
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Create blob from binary data
              blob = new Blob([bytes], { type: mimeType });
            } else {
              // If not a data URL, fetch it normally
              const res = await fetch(storedImage);
              if (!res.ok) throw new Error('Failed to fetch image data');
              blob = await res.blob();
            }
            
            const file = new File([blob], storedFilename || 'image.jpg', { type: blob.type });
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (!uploadResponse.ok) {
              // If 401, auth might not be ready yet - retry once
              if (uploadResponse.status === 401) {
                console.log('Auth not ready, retrying in 2 seconds...');
                setTimeout(handleUpload, 2000);
                return;
              }
              
              const errorText = await uploadResponse.text();
              console.error('Upload failed:', uploadResponse.status, errorText);
              throw new Error(`Upload failed: ${uploadResponse.status}`);
            }
            
            const uploadData = await uploadResponse.json();
            
            if (uploadData.success && uploadData.publicUrl) {
              setImageUrl(uploadData.publicUrl);
              detectImageDimensions(uploadData.publicUrl).then(() => {
                if (storedPrintWidth) setPrintWidth(storedPrintWidth);
                if (storedPrintHeight) setPrintHeight(storedPrintHeight);
              });
              
              // Clear stored data
              localStorage.removeItem('dpi_tool_image');
              localStorage.removeItem('dpi_tool_filename');
              localStorage.removeItem('dpi_tool_printWidth');
              localStorage.removeItem('dpi_tool_printHeight');
              sessionStorage.removeItem('dpi_tool_image');
              sessionStorage.removeItem('dpi_tool_filename');
              sessionStorage.removeItem('dpi_tool_printWidth');
              sessionStorage.removeItem('dpi_tool_printHeight');
            } else {
              console.error('Upload response error:', uploadData);
              setError(uploadData.error || 'Failed to upload image. Please try uploading again.');
            }
            setIsLoading(false);
          } catch (err) {
            console.error('Error processing DPI tool image:', err);
            setError('Failed to process image. Please try uploading again from the form below.');
            setIsLoading(false);
            
            // Clear bad data
            localStorage.removeItem('dpi_tool_image');
            localStorage.removeItem('dpi_tool_filename');
            localStorage.removeItem('dpi_tool_printWidth');
            localStorage.removeItem('dpi_tool_printHeight');
            sessionStorage.removeItem('dpi_tool_image');
            sessionStorage.removeItem('dpi_tool_filename');
            sessionStorage.removeItem('dpi_tool_printWidth');
            sessionStorage.removeItem('dpi_tool_printHeight');
          }
        };
        
        // Wait for auth to be ready before uploading
        if (user) {
          // User is already authenticated, upload immediately
          handleUpload();
        } else {
          // Wait for auth to initialize
          console.log('Waiting for authentication to initialize...');
          setTimeout(handleUpload, 2000);
        }
        return;
      } else {
        // No stored image but fromDpiTool is true
        console.log('No image found in storage for DPI tool redirect');
        setIsLoading(false);
      }
    }
    
    // Handle imageUrl parameter (from background removal or other tools)
    if (imageUrlParam) {
      try {
        const decodedUrl = decodeURIComponent(imageUrlParam);
        setImageUrl(decodedUrl);
        detectImageDimensions(decodedUrl).then(() => {
          // If print dimensions are provided in URL params, use them
          if (printWidthParam) {
            setPrintWidth(printWidthParam);
          }
          if (printHeightParam) {
            setPrintHeight(printHeightParam);
          }
        });
        setIsLoading(false);
      } catch (err) {
        setError('Invalid image URL provided');
        setIsLoading(false);
      }
      return;
    }
    
    // Handle imageId parameter (from upload flow)
    if (!imageId) {
      // If we came from DPI tool but have no image, just show the upscale page
      if (fromDpiTool === 'true') {
        setIsLoading(false);
        return;
      }
      // Otherwise redirect to process page
      router.push('/process');
      return;
    }

    // Fetch image URL from database
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/uploads/${imageId}`, {
          credentials: 'include', // Include cookies for authentication
        });
        const data = await response.json();
        
        if (data.success) {
          setImageUrl(data.publicUrl);
          detectImageDimensions(data.publicUrl);
        } else {
          throw new Error(data.error || 'Failed to load image');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [imageId, imageUrlParam, router, detectImageDimensions, printWidthParam, printHeightParam, searchParams, user]);

  // Refresh credits when page loads or regains focus
  useEffect(() => {
    if (user) {
      refreshCredits();
      
      // Refresh on window focus
      const handleFocus = () => refreshCredits();
      window.addEventListener('focus', handleFocus);
      
      // Refresh on visibility change (tab switching)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          refreshCredits();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user, refreshCredits]);

  // Process image with Deep-Image.ai
  const processImage = async () => {
    if (!imageUrl) {
      setError('Please wait for image to load.');
      return;
    }
    
    if (!user || !profile) {
      setShowSignupModal(true);
      return;
    }

    // Check credits (skip for admins)
    const isAdmin = profile.is_admin === true;
    if (!isAdmin && profile.credits_remaining < 1) {
      setError('Insufficient credits. Please purchase more credits.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert URL to File and check if compression is needed
      console.log('[Upscale] Converting URL to file for processing');
      let fileToUpload: File | null = null;
      let shouldUploadFile = false;
      
      try {
        // Convert URL to file
        const file = await urlToFile(imageUrl, 'input_image');
        console.log('[Upscale] File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        
        // Check if compression is needed (for files > 10MB or dimensions > 4096px)
        if (await needsCompression(file, 10, 4096)) {
          console.log('[Upscale] Large file detected, compressing before upload');
          setError('Compressing large image for processing...');
          
          fileToUpload = await compressImage(file, {
            maxSizeMB: 10,
            maxWidthOrHeight: 4096,
            quality: 0.95,
            format: 'jpeg'
          });
          
          shouldUploadFile = true;
          setError(null);
        } else if (file.size > 5 * 1024 * 1024) {
          // For files > 5MB, upload directly instead of using URL
          console.log('[Upscale] Medium file detected, uploading file instead of URL');
          fileToUpload = file;
          shouldUploadFile = true;
        }
      } catch (err) {
        console.log('[Upscale] Could not convert URL to file, using URL directly:', err);
        // Continue with URL-based processing
      }
      
      // Use the existing upscale API endpoint
      const formData = new FormData();
      
      if (shouldUploadFile && fileToUpload) {
        console.log('[Upscale] Uploading file directly');
        formData.append('image', fileToUpload);  // API expects 'image', not 'imageFile'
      } else {
        console.log('[Upscale] Using URL for processing');
        formData.append('imageUrl', imageUrl);
      }
      // Determine processing mode and handle DPI calculations
      let processingMode = showEnhancements ? 'auto_enhance' : 'basic_upscale';
      let upscaleInfo: ReturnType<typeof calculateUpscaleFactor> = null;
      
      // Handle DPI mode with exact dimensions
      let actualMode = mode;  // Track the actual mode we'll use
      if (mode === 'dpi') {
        upscaleInfo = calculateUpscaleFactor();
        if (!upscaleInfo) {
          setError('Please enter valid print dimensions');
          setIsProcessing(false);
          return;
        }
        
        // Check if the scale factor is effectively 1.0 (no upscaling needed)
        if (upscaleInfo.scale < 1.2) {  // Less than 20% increase
          console.log('[Upscale] Image already meets DPI requirements, using 2x scale instead');
          // Switch to simple mode with 2x scale
          actualMode = 'simple';
          // Clear the upscaleInfo since we're not using DPI mode anymore
          upscaleInfo = null;
          setError('Your image already meets the required DPI. Applying 2x upscale with enhancements instead.');
          setTimeout(() => setError(null), 3000);
        } else {
          // Check if we need to force basic mode for large dimensions
          const megapixels = (upscaleInfo.requiredWidth * upscaleInfo.requiredHeight) / 1000000;
          if (megapixels > 20) {  // Reduced threshold from 30 to 20
            console.warn('[Upscale] Forcing basic mode for large image (>20MP):', megapixels.toFixed(2), 'MP');
            processingMode = 'basic_upscale';
            setError('Using fast processing mode for large image. AI enhancements disabled.');
            setTimeout(() => setError(null), 3000);
          }
        
        // Log dimension limiting info
        if (upscaleInfo.limitedByMax) {
          console.log('[Upscale] Dimensions were limited to prevent timeout:', {
            targetDimensions: `${upscaleInfo.requiredWidth}x${upscaleInfo.requiredHeight}`,
            megapixels: megapixels.toFixed(2)
          });
        }
        
        // Add target dimensions for DPI mode only if we're still in DPI mode
        if (actualMode === 'dpi' && upscaleInfo) {
          formData.append('targetWidth', upscaleInfo.requiredWidth.toString());
          formData.append('targetHeight', upscaleInfo.requiredHeight.toString());
        }
        
        // Warn user if dimensions were limited
        if (upscaleInfo.limitedByMax) {
          const actualDPI = Math.round(Math.min(
            upscaleInfo.requiredWidth / parseFloat(printWidth),
            upscaleInfo.requiredHeight / parseFloat(printHeight)
          ));
          setError(`Note: Image dimensions limited to prevent timeout. Result will be ${actualDPI} DPI instead of 300 DPI.`);
          // Continue processing but show warning
          setTimeout(() => setError(null), 5000);
        }
        
        console.log('DPI Mode Upscale:', {
          currentDPI: upscaleInfo.currentDPI,
          targetDPI: 300,
          scale: upscaleInfo.scale,
          requiredDimensions: `${upscaleInfo.requiredWidth}x${upscaleInfo.requiredHeight}`,
          limited: upscaleInfo.limitedByMax
        });
        }  // Close the else block from line 457
      }
      
      // Handle scale for simple mode (either original simple or converted from DPI)
      if (actualMode === 'simple') {
        // Deep-Image only supports 2x and 4x, so use 4x for 3x requests
        const actualScale = selectedScale === '3' ? '4' : selectedScale;
        // If we switched from DPI mode, default to 2x
        const scaleToUse = mode === 'dpi' ? '2' : actualScale;
        formData.append('scale', scaleToUse);
      }
      
      // Add processing mode after all logic
      formData.append('processingMode', processingMode);

      // Create an AbortController for timeout (adjust based on image size)
      const controller = new AbortController();
      let timeoutDuration = shouldUploadFile ? 90000 : 60000; // Base: 90s for uploads, 60s for URLs
      
      // Extend timeout for very large dimensions
      if (actualMode === 'dpi' && upscaleInfo) {
        const megapixels = (upscaleInfo.requiredWidth * upscaleInfo.requiredHeight) / 1000000;
        if (megapixels > 40) timeoutDuration = 120000; // 2 minutes for >40MP
        if (megapixels > 30) timeoutDuration = 100000; // 100s for >30MP
      }
      
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      console.log(`[Upscale] Setting timeout to ${timeoutDuration/1000} seconds`);

      // Determine if we should use async processing
      // Use async for large images that might timeout
      const megapixels = actualMode === 'dpi' && upscaleInfo
        ? (upscaleInfo.requiredWidth * upscaleInfo.requiredHeight) / 1000000
        : 0;

      const useAsync = megapixels > 20 || // More than 20MP
                      (actualMode === 'dpi' && megapixels > 15) || // DPI mode with >15MP
                      processingMode === 'generative_upscale'; // Generative mode is slow

      console.log('[Upscale] Processing mode:', {
        useAsync,
        megapixels: megapixels.toFixed(2),
        processingMode
      });

      let response;

      if (useAsync) {
        // Use async endpoint for large images
        response = await fetch('/api/upscale-async', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        clearTimeout(timeoutId);
      } else {
        // Use regular endpoint for smaller images
        response = await fetch('/api/upscale', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      let result;
      
      // Handle different response statuses first
      if (response.status === 504) {
        throw new Error('The server took too long to process your image. Please try again with a smaller image or simpler settings.');
      }
      
      if (response.status === 502 || response.status === 503) {
        throw new Error('The image processing service is temporarily unavailable. Please try again in a few moments.');
      }
      
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error('[Upscale] Failed to parse JSON response:', jsonError);
          throw new Error('Invalid response from server. Please try again.');
        }
      } else {
        // If not JSON (likely an error page), provide a better error message
        const text = await response.text();
        console.error('[Upscale] Non-JSON response:', text.substring(0, 200));
        
        // Check for common error patterns
        if (response.status === 504 || text.includes('Gateway Timeout')) {
          throw new Error('The server took too long to process your image. Please try again with a smaller image.');
        }
        
        throw new Error(`Server error (${response.status}). Please try again.`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Processing failed with status ${response.status}`);
      }

      // Handle async response
      if (result.jobId) {
        console.log('[Upscale] Async job started:', result.jobId);
        setIsAsyncProcessing(true);
        setProcessingProgress(5);
        startPolling(result.jobId);
        return; // Exit here, polling will handle the rest
      }

      if (!result.success || !result.url) {
        throw new Error(result.error || 'No result URL received');
      }

      setProcessedUrl(result.url);
      setProcessedImageId(result.imageId || null); // Store the image ID
      
      // Log the result URL to verify PNG format
      console.log('[Upscale Client] Processing complete:', {
        url: result.url,
        imageId: result.imageId,
        isPNG: result.url?.includes('.png'),
        urlExtension: result.url?.split('.').pop()?.split('?')[0]
      });
      
      // Refresh credits after successful processing
      await refreshCredits();

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Processing is taking longer than expected. For large images, please try: 1) Reducing image dimensions before uploading, 2) Using a smaller upscale factor, or 3) Disabling AI enhancements.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Processing failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async () => {
    if (!processedUrl) return;
    
    try {
      // Fetch the image and create a blob URL for proper downloading
      const response = await fetch(processedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Always use PNG extension for upscaled images
      const filename = mode === 'dpi' 
        ? `upscaled-300dpi.png`
        : `upscaled-${selectedScale}x.png`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Downloaded upscaled image as: ${filename}`);
      
      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab if fetch fails
      window.open(processedUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-4xl mx-auto p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[
              { label: 'Process Image', href: '/process' },
              { label: 'Upscale' }
            ]} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-blue-600" />
                Upscale Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && !imageUrl && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading image...</p>
                </div>
              )}

              {/* Upload form when no image */}
              {!isLoading && !imageUrl && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Upload an image to begin upscaling</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setIsLoading(true);
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        try {
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include'
                          });
                          
                          const data = await response.json();
                          
                          if (data.success && data.publicUrl) {
                            setImageUrl(data.publicUrl);
                            await detectImageDimensions(data.publicUrl);
                          } else {
                            setError(data.error || 'Failed to upload image');
                          }
                        } catch (err) {
                          setError('Failed to upload image');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="hidden"
                      id="upscale-upload"
                    />
                    <label htmlFor="upscale-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">Click to upload image</p>
                      <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {imageUrl && (
                <div className="space-y-6">
                  {/* Original Image */}
                  <div>
                    <h3 className="font-medium mb-2">Original Image</h3>
                    <img 
                      src={imageUrl} 
                      alt="Original" 
                      className="max-w-full h-auto rounded-lg border"
                      style={{ maxHeight: '400px' }}
                    />
                    {imageDimensions && (
                      <p className="text-sm text-gray-600 mt-2">
                        Dimensions: {imageDimensions.width} × {imageDimensions.height} pixels
                      </p>
                    )}
                  </div>

                  {/* Processing Options */}
                  {!processedUrl && (
                    <div className="space-y-4">
                      {/* Mode Toggle */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-center gap-2 mb-4">
                          <button
                            onClick={() => setMode('simple')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              mode === 'simple'
                                ? 'bg-[#366494] text-white'
                                : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                          >
                            Simple Mode
                          </button>
                          <button
                            onClick={() => setMode('dpi')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                              mode === 'dpi'
                                ? 'bg-[#366494] text-white'
                                : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                          >
                            <Calculator className="w-4 h-4" />
                            Smart DPI Mode
                          </button>
                        </div>
                        
                        {mode === 'simple' ? (
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Upscale Factor
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {['2', '3', '4'].map((scale) => (
                                <button
                                  key={scale}
                                  onClick={() => setSelectedScale(scale)}
                                  className={`p-2 border rounded-lg transition-colors ${
                                    selectedScale === scale
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`}
                                >
                                  {scale}x
                                </button>
                              ))}
                            </div>
                            {/* Large Image Processing Indicator for Simple Mode */}
                            {(() => {
                              if (!imageDimensions) return null;
                              const scale = parseInt(selectedScale);
                              const outputWidth = imageDimensions.width * scale;
                              const outputHeight = imageDimensions.height * scale;
                              const megapixels = (outputWidth * outputHeight) / 1000000;
                              const willUseAsync = megapixels > 20;

                              if (willUseAsync) {
                                return (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                    <p className="text-sm text-blue-700 font-medium">
                                      <Info className="w-4 h-4 inline mr-1" />
                                      Large Image Processing Mode
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      Output will be {megapixels.toFixed(1)} megapixels ({outputWidth} × {outputHeight}).
                                      Enhanced processing will be used for optimal quality (30-60 seconds).
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* DPI Info Display */}
                            {imageDimensions && printWidth && printHeight && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-blue-700 font-medium">Print Quality Analysis</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      Target: {printWidth}" × {printHeight}" at 300 DPI
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {(() => {
                                      const info = calculateUpscaleFactor();
                                      if (!info) return null;
                                      const quality = info.currentDPI >= 300 ? 'excellent' : 
                                                     info.currentDPI >= 200 ? 'good' : 
                                                     info.currentDPI >= 150 ? 'fair' : 'poor';
                                      const colors = {
                                        excellent: 'text-green-700',
                                        good: 'text-blue-700',
                                        fair: 'text-yellow-700',
                                        poor: 'text-red-700'
                                      };
                                      
                                      return (
                                        <>
                                          <p className={`text-2xl font-bold ${colors[quality]}`}>
                                            {info.currentDPI} DPI
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            Needs {info.scale.toFixed(1)}x upscale
                                          </p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Aspect Ratio Lock */}
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                {maintainAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                Maintain Aspect Ratio
                              </label>
                              <button
                                type="button"
                                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  maintainAspectRatio ? 'bg-[#366494]' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    maintainAspectRatio ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Print Size Inputs */}
                            {printWidth && parseFloat(printWidth) >= 10 && imageDimensions && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                <p className="text-xs text-amber-700">
                                  <Info className="w-3 h-3 inline mr-1" />
                                  Showing quality for {printWidth}" width (minimum 10" for realistic print assessment).
                                  Most DTF prints are 10-13 inches wide.
                                </p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Print Width (inches)
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.1"
                                  value={printWidth}
                                  onChange={(e) => handleWidthChange(e.target.value)}
                                  placeholder="e.g., 11"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Print Height (inches)
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.1"
                                  value={printHeight}
                                  onChange={(e) => handleHeightChange(e.target.value)}
                                  placeholder="e.g., 14"
                                />
                              </div>
                            </div>
                            
                            {/* Common Print Sizes */}
                            <div>
                              <p className="text-xs text-gray-600 mb-2">Common DTF sizes:</p>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { label: '8×10', width: 8, height: 10 },
                                  { label: '11×14', width: 11, height: 14 },
                                  { label: '12×15', width: 12, height: 15 },
                                  { label: '12×16', width: 12, height: 16 }
                                ].map(size => (
                                  <button
                                    key={size.label}
                                    onClick={() => {
                                      if (maintainAspectRatio && aspectRatio) {
                                        // Fit to size while maintaining aspect ratio
                                        const widthRatio = size.width / (imageDimensions!.width / 300);
                                        const heightRatio = size.height / (imageDimensions!.height / 300);
                                        const ratio = Math.min(widthRatio, heightRatio);
                                        
                                        const newWidth = (imageDimensions!.width / 300) * ratio;
                                        const newHeight = (imageDimensions!.height / 300) * ratio;
                                        
                                        setPrintWidth(newWidth.toFixed(2));
                                        setPrintHeight(newHeight.toFixed(2));
                                      } else {
                                        setPrintWidth(size.width.toString());
                                        setPrintHeight(size.height.toString());
                                      }
                                    }}
                                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                                  >
                                    {size.label}"
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Upscale Info */}
                            {(() => {
                              const info = calculateUpscaleFactor();
                              if (!info) return null;
                              
                              if (info.currentDPI >= 300) {
                                return (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm text-green-700">
                                      <Info className="w-4 h-4 inline mr-1" />
                                      Your image already meets 300 DPI for this print size. Upscaling is optional.
                                    </p>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="space-y-2">
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-yellow-700">
                                      <Info className="w-4 h-4 inline mr-1" />
                                      Will upscale to {info.requiredWidth} × {info.requiredHeight} pixels ({info.scale.toFixed(1)}x) for 300 DPI quality
                                    </p>
                                  </div>
                                  {(() => {
                                    const megapixels = (info.requiredWidth * info.requiredHeight) / 1000000;
                                    const willUseAsync = megapixels > 20 || (mode === 'dpi' && megapixels > 15);
                                    if (willUseAsync) {
                                      return (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                          <p className="text-sm text-blue-700 font-medium">
                                            <Info className="w-4 h-4 inline mr-1" />
                                            Large Image Processing Mode
                                          </p>
                                          <p className="text-xs text-blue-600 mt-1">
                                            This {megapixels.toFixed(1)} megapixel image will use enhanced processing for optimal quality.
                                            Processing may take 30-60 seconds.
                                          </p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={showEnhancements}
                            onChange={(e) => setShowEnhancements(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">
                            Apply AI enhancements (denoise, deblur, color correction)
                          </span>
                        </label>
                      </div>

                      {profile && !profile.is_admin && profile.credits_remaining < 1 && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                          <p className="font-medium">Insufficient Credits</p>
                          <p className="text-xs mt-1">You need at least 1 credit to upscale an image. Please purchase more credits or upgrade your plan.</p>
                        </div>
                      )}

                      <Button
                        onClick={processImage}
                        disabled={isProcessing || !profile || (!profile.is_admin && profile.credits_remaining < 1)}
                        className="w-full"
                        size="lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {isAsyncProcessing
                              ? jobStatus === 'processing'
                                ? `Processing Large Image... ${processingProgress}%`
                                : `Initializing... ${processingProgress}%`
                              : 'Processing...'
                            }
                          </>
                        ) : mode === 'dpi' ? (
                          <>
                            <Calculator className="w-5 h-5 mr-2" />
                            Upscale to 300 DPI
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-5 h-5 mr-2" />
                            Upscale Image ({selectedScale}x)
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Processed Result */}
                  {processedUrl && (
                    <div className="space-y-4">
                      <h3 className="font-medium mb-2">Upscaled Result</h3>
                      <img 
                        src={processedUrl} 
                        alt="Upscaled" 
                        className="max-w-full h-auto rounded-lg border"
                        style={{ maxHeight: '600px' }}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={downloadImage}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Result
                        </Button>
                        <Button
                          onClick={async () => {
                            console.log('Remove Background clicked');
                            console.log('processedImageId:', processedImageId);
                            console.log('processedUrl:', processedUrl);
                            
                            // Prefer using image ID for navigation (much shorter URL)
                            if (processedImageId) {
                              console.log('Using image ID for navigation:', processedImageId);
                              const targetUrl = `/process/background-removal?imageId=${processedImageId}`;
                              console.log('Target URL:', targetUrl);
                              router.push(targetUrl);
                              return;
                            }
                            
                            // Fallback to URL-based navigation if no ID available
                            if (!processedUrl) {
                              alert('No processed image available. Please wait for the image to finish processing.');
                              return;
                            }
                            
                            console.log('No image ID available, falling back to URL');
                            console.log('processedUrl length:', processedUrl?.length);
                            console.log('Is data URL?', processedUrl?.startsWith('data:'));
                            
                            // If it's a data URL and too large, handle differently
                            if (processedUrl.startsWith('data:') && processedUrl.length > 2000) {
                              console.log('Data URL is too large for URL parameter');
                              
                              // Store in sessionStorage and navigate with a key
                              const storageKey = `temp_image_${Date.now()}`;
                              try {
                                sessionStorage.setItem(storageKey, processedUrl);
                                console.log('Stored image in sessionStorage with key:', storageKey);
                                
                                // Navigate with the storage key instead
                                const targetUrl = `/process/background-removal?tempImage=${storageKey}`;
                                router.push(targetUrl);
                              } catch (storageError) {
                                console.error('Failed to store in sessionStorage:', storageError);
                                alert('The image is too large to process directly. Please download it first and then upload it to the background removal tool.');
                              }
                              return;
                            }
                            
                            // For regular URLs or small data URLs
                            const targetUrl = `/process/background-removal?imageUrl=${encodeURIComponent(processedUrl)}`;
                            console.log('Target URL:', targetUrl);
                            console.log('Target URL length:', targetUrl.length);
                            
                            try {
                              console.log('Attempting navigation...');
                              router.push(targetUrl);
                            } catch (error) {
                              console.error('Navigation failed:', error);
                              alert('Unable to navigate. Please check the browser console for details.');
                            }
                          }}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          <Scissors className="w-4 h-4" />
                          Remove Background
                        </Button>
                        <Button
                          onClick={() => {
                            setProcessedUrl(null);
                            setProcessedImageId(null);
                            setSelectedScale('2');
                            setShowEnhancements(false);
                          }}
                          variant="outline"
                        >
                          Upscale Again
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-green-600">
                          ✓ Image upscaled and saved to your account
                        </p>
                        {isAsyncProcessing && (
                          <p className="text-xs text-blue-600">
                            ✓ Enhanced processing used for optimal quality
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    {mode === 'dpi' ? (
                      <>
                        <h4 className="font-medium mb-2">Smart DPI Upscaling Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Automatically calculates exact upscaling needed for 300 DPI</li>
                          <li>Ensures professional print quality at your selected size</li>
                          <li>AI-powered detail enhancement during upscaling</li>
                          <li>Optional noise reduction and sharpening</li>
                          <li>Preserves image quality while achieving target resolution</li>
                        </ul>
                      </>
                    ) : (
                      <>
                        <h4 className="font-medium mb-2">AI Upscaling Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Increase resolution by 2x, 3x, or 4x</li>
                          <li>AI-powered detail enhancement</li>
                          <li>Optional noise reduction and sharpening</li>
                          <li>Automatic color and lighting correction</li>
                          <li>Preserves image quality while enlarging</li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Signup Modal */}
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)}
        feature="AI image upscaling"
      />
    </div>
  );
}