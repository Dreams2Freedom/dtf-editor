'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSearchParams } from 'next/navigation';
import { Upload, Wand2, Download, AlertCircle, CheckCircle, Loader2, Scissors, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ProcessingOperation } from '@/services/imageProcessing';
import { useAuthStore } from '@/stores/authStore';
import { formatFileSize, formatProcessingTime } from '@/lib/utils';
import { env } from '@/config/env';

declare global {
  interface Window {
    ClippingMagic: any;
    cmImageData?: {
      id: number;
      secret: string;
    };
  }
}

interface ProcessingResult {
  success: boolean;
  url?: string;
  error?: string;
  creditsUsed?: number;
  processingTime?: number;
}

interface ProcessingOptions {
  operation: ProcessingOperation;
  scale?: 2 | 4;
  processingMode?: 'auto_enhance' | 'generative_upscale' | 'basic_upscale';
  faceEnhance?: boolean;
  backgroundColor?: string;
  vectorFormat?: 'svg' | 'pdf';
}

export function ImageProcessor() {
  const searchParams = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    operation: 'upscale',
    scale: 4,
    processingMode: 'auto_enhance',
    faceEnhance: false,
    vectorFormat: 'svg'
  });
  const [clippingMagicReady, setClippingMagicReady] = useState(false);
  
  const { user, profile } = useAuthStore();

  // Set initial operation from URL parameter
  useEffect(() => {
    const operation = searchParams.get('operation') as ProcessingOperation;
    if (operation && ['upscale', 'background-removal', 'vectorization', 'ai-generation'].includes(operation)) {
      setProcessingOptions(prev => ({ ...prev, operation }));
    }
  }, [searchParams]);

  // Load and initialize ClippingMagic exactly like the test page
  useEffect(() => {
    const loadClippingMagic = () => {
      // Check if already loaded
      if (window.ClippingMagic) {
        const errors = window.ClippingMagic.initialize({ 
          apiId: parseInt(env.CLIPPINGMAGIC_API_KEY),
          forcePopup: true // Force popup mode instead of iframe
        });
        
        if (errors.length === 0) {
          setClippingMagicReady(true);
        }
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
      script.type = 'text/javascript';
      script.async = true;
      
      script.onload = () => {
        if (window.ClippingMagic) {
          const errors = window.ClippingMagic.initialize({ 
            apiId: parseInt(env.CLIPPINGMAGIC_API_KEY),
            forcePopup: true // Force popup mode instead of iframe
          });
          
          if (errors.length === 0) {
            setClippingMagicReady(true);
            console.log('ClippingMagic initialized');
          } else {
            console.error('ClippingMagic initialization failed:', errors);
          }
        }
      };
      
      document.body.appendChild(script);
    };

    // Wait for window load like the test page does
    if (document.readyState === 'complete') {
      loadClippingMagic();
    } else {
      window.addEventListener('load', loadClippingMagic);
      return () => window.removeEventListener('load', loadClippingMagic);
    }
  }, []);

  // Download ClippingMagic result
  const downloadClippingMagicResult = async (imageId: string) => {
    try {
      const response = await fetch(`/api/clippingmagic/download/${imageId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to download result');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setIsProcessing(false);
      setProcessingResult({
        success: true,
        url: url,
        creditsUsed: 1
      });
    } catch (error) {
      setIsProcessing(false);
      setProcessingResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download result'
      });
    }
  };

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image file.';
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 10MB.';
    }

    return null;
  }, []);

  // Handle file drop/selection
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setProcessingResult({
        success: false,
        error: validationError
      });
      return;
    }

    setSelectedFile(file);
    setProcessingResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  // Process image
  const processImage = async () => {
    if (!selectedFile || !user) return;

    setIsProcessing(true);
    setProcessingResult(null);

    // For background removal, upload and open editor immediately
    if (processingOptions.operation === 'background-removal') {
      try {
        // Upload image to ClippingMagic
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await fetch('/api/clippingmagic/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success && result.image) {
          console.log('Upload successful:', result.image);
          
          // Debug what's in the window
          console.log('=== ClippingMagic Debug ===');
          console.log('window.ClippingMagic exists:', !!window.ClippingMagic);
          console.log('window.ClippingMagic.edit exists:', !!(window.ClippingMagic?.edit));
          console.log('typeof window.ClippingMagic.edit:', typeof window.ClippingMagic?.edit);
          console.log('Current URL:', window.location.href);
          console.log('Document readyState:', document.readyState);
          
          // Check if we're in an iframe
          console.log('In iframe?:', window !== window.top);
          console.log('Parent origin:', window.parent.location.origin);
          
          // List all properties of ClippingMagic
          if (window.ClippingMagic) {
            console.log('ClippingMagic properties:', Object.keys(window.ClippingMagic));
          }
          
          console.log('Opening ClippingMagic editor as overlay...');
          
          // Wait a bit to ensure everything is ready
          setTimeout(() => {
            if (window.ClippingMagic && window.ClippingMagic.edit) {
              try {
                window.ClippingMagic.edit({
                  image: {
                    id: result.image.id,
                    secret: result.image.secret
                  },
                  useStickySettings: true,
                  hideBottomToolbar: false,
                  locale: 'en-US'
                }, (opts: any) => {
                  console.log('ClippingMagic callback:', opts);
                  switch (opts.event) {
                    case 'error':
                      console.error('ClippingMagic error:', opts.error);
                      setIsProcessing(false);
                      setProcessingResult({
                        success: false,
                        error: 'ClippingMagic error: ' + (opts.error?.message || 'Unknown error')
                      });
                      break;
                      
                    case 'result-generated':
                      console.log('Result generated for image:', opts.image.id);
                      downloadClippingMagicResult(opts.image.id.toString());
                      break;
                      
                    case 'editor-exit':
                      console.log('Editor closed');
                      setIsProcessing(false);
                      break;
                  }
                });
              } catch (editError) {
                console.error('Error calling ClippingMagic.edit:', editError);
                setIsProcessing(false);
                setProcessingResult({
                  success: false,
                  error: 'Failed to open editor: ' + editError
                });
              }
            } else {
              throw new Error('ClippingMagic not ready. Please try again.');
            }
          }, 500);
        } else {
          throw new Error(result.error || 'Failed to upload image');
        }
      } catch (error) {
        setIsProcessing(false);
        setProcessingResult({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload image'
        });
      }
      return;
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('operation', processingOptions.operation);
      
      // Add operation-specific options
      if (processingOptions.operation === 'upscale') {
        formData.append('scale', processingOptions.scale?.toString() || '4');
        formData.append('processingMode', processingOptions.processingMode || 'auto_enhance');
        if (processingOptions.faceEnhance) {
          formData.append('faceEnhance', 'true');
        }
      }
      
      if (processingOptions.operation === 'background-removal') {
        if (processingOptions.backgroundColor) {
          formData.append('backgroundColor', processingOptions.backgroundColor);
        }
      }
      
      if (processingOptions.operation === 'vectorization') {
        formData.append('vectorFormat', processingOptions.vectorFormat || 'svg');
      }

      // Use the unified processing endpoint
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
        headers: {
          // Don't set Content-Type - let browser set it for FormData
          'Accept': 'application/json',
        }
      });

      console.log('API Response status:', response.status);
      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        setProcessingResult({
          success: true,
          url: result.processedUrl,
          creditsUsed: result.metadata?.creditsUsed,
          processingTime: result.metadata?.processingTime
        });
      } else {
        setProcessingResult({
          success: false,
          error: result.error || 'Processing failed'
        });
      }
    } catch (error) {
      setProcessingResult({
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open ClippingMagic editor - matches test page behavior
  const openClippingMagicEditor = () => {
    if (!window.cmImageData) {
      alert('Please upload an image first');
      return;
    }

    if (!window.ClippingMagic || !window.ClippingMagic.edit) {
      alert('ClippingMagic is still loading. Please wait a moment and try again.');
      return;
    }

    console.log('Opening ClippingMagic editor with:', window.cmImageData);
    
    // Call edit directly, just like the test page
    window.ClippingMagic.edit({
      image: {
        id: window.cmImageData.id,
        secret: window.cmImageData.secret
      },
      useStickySettings: true,
      hideBottomToolbar: false,
      locale: 'en-US'
    }, (opts: any) => {
      console.log('ClippingMagic callback:', opts);
      switch (opts.event) {
        case 'error':
          alert('ClippingMagic error: ' + (opts.error?.message || 'Unknown error'));
          break;
          
        case 'result-generated':
          console.log('Result generated for image:', opts.image.id);
          // Download the result
          downloadClippingMagicResult(opts.image.id.toString());
          break;
          
        case 'editor-exit':
          console.log('Editor closed');
          break;
      }
    });
  };

  // Download processed image
  const downloadImage = async () => {
    if (!processingResult?.url) return;

    try {
      const response = await fetch(processingResult.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${selectedFile?.name || 'image.jpg'}`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download image');
    }
  };


  // Reset the component
  const reset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setProcessingResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Debug section */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-bold mb-2">Debug Controls</h3>
        <div className="space-x-2">
          <button
            onClick={() => {
              console.log('Testing popup...');
              const popup = window.open('https://google.com', '_blank', 'width=800,height=600');
              console.log('Popup result:', popup);
              if (!popup) {
                alert('Popup blocked! Please allow popups for this site.');
              }
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Test Popup
          </button>
          <button
            onClick={() => {
              console.log('Testing ClippingMagic.edit directly...');
              if (window.ClippingMagic && window.ClippingMagic.edit) {
                window.ClippingMagic.edit({
                  image: { id: 207794051, secret: "g5rssaot702277tqfdpufdmqjtkc2u8j9h9t7fhro879csnbmtv" },
                  useStickySettings: true,
                  hideBottomToolbar: false,
                  locale: 'en-US'
                }, (opts: any) => {
                  console.log('Direct test callback:', opts);
                });
              } else {
                alert('ClippingMagic not loaded');
              }
            }}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Test ClippingMagic Direct
          </button>
          <span className="text-sm text-gray-600">
            ClippingMagic loaded: {clippingMagicReady ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Image Processing
        </h1>
        <p className="text-gray-600">
          Upload an image and enhance it with our AI-powered tools
        </p>
        {profile && (
          <p className="text-sm text-blue-600 mt-2">
            You have {profile.credits_remaining} credits remaining
          </p>
        )}
      </div>

      {/* Upload Area */}
      {!selectedFile && (
        <Card>
          <CardContent className="p-8">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop your image here' : 'Drag & drop an image here'}
              </p>
              <p className="text-gray-500 mb-4">
                or click to select a file
              </p>
              <p className="text-sm text-gray-400">
                Supports JPEG, PNG, WebP • Max 10MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview and Processing Options */}
      {selectedFile && imagePreview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Original Image
                <Button variant="outline" size="sm" onClick={reset}>
                  Change Image
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OptimizedImage
                src={imagePreview}
                alt="Original"
                width={400}
                height={300}
                className="w-full h-auto rounded-lg border"
                quality={90}
              />
              <p className="text-sm text-gray-500 mt-2">
                {selectedFile.name} • {formatFileSize(selectedFile.size)}
              </p>
            </CardContent>
          </Card>

          {/* Processing Options */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Operation Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={processingOptions.operation === 'upscale' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setProcessingOptions(prev => ({ ...prev, operation: 'upscale' }))}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Upscale
                  </Button>
                  <Button
                    variant={processingOptions.operation === 'background-removal' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setProcessingOptions(prev => ({ ...prev, operation: 'background-removal' }))}
                  >
                    <Scissors className="w-4 h-4 mr-2" />
                    Remove BG
                  </Button>
                  <Button
                    variant={processingOptions.operation === 'vectorization' ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setProcessingOptions(prev => ({ ...prev, operation: 'vectorization' }))}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Vectorize
                  </Button>
                </div>
              </div>

              {/* Upscale Options */}
              {processingOptions.operation === 'upscale' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scale Factor
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={processingOptions.scale === 2 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setProcessingOptions(prev => ({ ...prev, scale: 2 }))}
                      >
                        2x
                      </Button>
                      <Button
                        variant={processingOptions.scale === 4 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setProcessingOptions(prev => ({ ...prev, scale: 4 }))}
                      >
                        4x
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Processing Mode
                    </label>
                    <div className="space-y-2">
                      <Button
                        variant={processingOptions.processingMode === 'auto_enhance' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setProcessingOptions(prev => ({ ...prev, processingMode: 'auto_enhance' }))}
                      >
                        Auto Enhance (Recommended)
                      </Button>
                      <Button
                        variant={processingOptions.processingMode === 'generative_upscale' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setProcessingOptions(prev => ({ ...prev, processingMode: 'generative_upscale' }))}
                      >
                        Generative Upscale
                      </Button>
                      <Button
                        variant={processingOptions.processingMode === 'basic_upscale' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setProcessingOptions(prev => ({ ...prev, processingMode: 'basic_upscale' }))}
                      >
                        Basic Upscale
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="faceEnhance"
                      checked={processingOptions.faceEnhance}
                      onChange={(e) => setProcessingOptions(prev => ({ ...prev, faceEnhance: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="faceEnhance" className="text-sm text-gray-700">
                      Enhance faces
                    </label>
                  </div>
                </>
              )}

              {/* Background Removal Options */}
              {processingOptions.operation === 'background-removal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color (Optional)
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={!processingOptions.backgroundColor ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProcessingOptions(prev => ({ ...prev, backgroundColor: undefined }))}
                    >
                      Transparent
                    </Button>
                    <Button
                      variant={processingOptions.backgroundColor === '#ffffff' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProcessingOptions(prev => ({ ...prev, backgroundColor: '#ffffff' }))}
                    >
                      White
                    </Button>
                    <Button
                      variant={processingOptions.backgroundColor === '#000000' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProcessingOptions(prev => ({ ...prev, backgroundColor: '#000000' }))}
                    >
                      Black
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Opens the ClippingMagic editor where you can manually refine background removal.
                  </p>
                </div>
              )}

              {/* Vectorization Options */}
              {processingOptions.operation === 'vectorization' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Format
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={processingOptions.vectorFormat === 'svg' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProcessingOptions(prev => ({ ...prev, vectorFormat: 'svg' }))}
                    >
                      SVG
                    </Button>
                    <Button
                      variant={processingOptions.vectorFormat === 'pdf' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setProcessingOptions(prev => ({ ...prev, vectorFormat: 'pdf' }))}
                    >
                      PDF
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    SVG format is scalable and web-friendly. PDF is better for print designs.
                  </p>
                </div>
              )}


              {/* Process Button */}
              <Button
                onClick={processImage}
                disabled={isProcessing || !user || (profile?.credits_remaining || 0) < (processingOptions.operation === 'vectorization' ? 2 : 1)}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {processingOptions.operation === 'upscale' && <Wand2 className="w-4 h-4 mr-2" />}
                    {processingOptions.operation === 'background-removal' && <Scissors className="w-4 h-4 mr-2" />}
                    {processingOptions.operation === 'vectorization' && <Zap className="w-4 h-4 mr-2" />}
                    {processingOptions.operation === 'upscale' && 'Upscale Image (1 credit)'}
                    {processingOptions.operation === 'background-removal' && 'Remove Background (1 credit)'}
                    {processingOptions.operation === 'vectorization' && 'Vectorize Image (2 credits)'}
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-sm text-red-600 text-center">
                  Please log in to process images
                </p>
              )}

              {user && (profile?.credits_remaining || 0) < (processingOptions.operation === 'vectorization' ? 2 : 1) && (
                <p className="text-sm text-red-600 text-center">
                  Insufficient credits. Need {processingOptions.operation === 'vectorization' ? 2 : 1} credit{processingOptions.operation === 'vectorization' ? 's' : ''} for this operation.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processing Result */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {processingResult.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Processing Complete
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Processing Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processingResult.success && processingResult.url ? (
                <div className="space-y-4">
                  <OptimizedImage
                    src={processingResult.url}
                    alt="Processed"
                    width={600}
                    height={400}
                    className="w-full h-auto rounded-lg border"
                    quality={95}
                    priority
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {processingResult.processingTime && (
                        <span>Processed in {formatProcessingTime(processingResult.processingTime)}</span>
                      )}
                      {processingResult.creditsUsed && (
                        <span className="ml-4">Credits used: {processingResult.creditsUsed}</span>
                      )}
                    </div>
                    <Button onClick={downloadImage}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
            ) : (
              <div className="text-red-600">
                <p>{processingResult.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}