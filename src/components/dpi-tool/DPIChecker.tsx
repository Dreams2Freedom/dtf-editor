'use client';

import { useState, useCallback } from 'react';
import { Upload, Calculator, AlertCircle, CheckCircle, XCircle, Info, Loader2, Lock, Unlock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { calculateDPI, getImageDimensions, getQualityColor, type DPICalculationResult } from '@/utils/dpiCalculator';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface DPICheckerProps {
  showSignupForm?: boolean;
  onSignupComplete?: () => void;
}

export function DPIChecker({ showSignupForm = true, onSignupComplete }: DPICheckerProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [printWidth, setPrintWidth] = useState<string>('');
  const [printHeight, setPrintHeight] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [dpiResult, setDpiResult] = useState<DPICalculationResult | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  
  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

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

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const url = URL.createObjectURL(file);
    setImagePreview(url);

    // Get dimensions
    try {
      const dimensions = await getImageDimensions(file);
      setImageDimensions(dimensions);
      
      // Calculate aspect ratio
      const ratio = dimensions.width / dimensions.height;
      setAspectRatio(ratio);
      
      // Set default print dimensions based on 300 DPI
      const defaultWidth = dimensions.width / 300;
      const defaultHeight = dimensions.height / 300;
      
      // Round to 2 decimal places
      setPrintWidth(defaultWidth.toFixed(2));
      setPrintHeight(defaultHeight.toFixed(2));
      
      // Clear previous results when new image is uploaded
      setShowResult(false);
      setDpiResult(null);
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      alert('Error reading image. Please try another file.');
    }
  }, []);

  // Calculate DPI in real-time for display (no longer needed for a button)
  const calculateCurrentDPI = useCallback(() => {
    if (!imageDimensions || !printWidth || !printHeight) return null;
    
    const width = parseFloat(printWidth);
    const height = parseFloat(printHeight);
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) return null;
    
    return calculateDPI({
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      printWidth: width,
      printHeight: height
    });
  }, [imageDimensions, printWidth, printHeight]);

  const handleUpscaleClick = () => {
    // If user is logged in, go directly to upscaler
    if (user) {
      const params = new URLSearchParams();
      params.append('imageUrl', encodeURIComponent(imagePreview));
      params.append('printWidth', printWidth);
      params.append('printHeight', printHeight);
      router.push(`/process/upscale?${params.toString()}`);
    } else {
      // Show signup form for non-logged-in users
      setShowSignup(true);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setSignupLoading(true);

    try {
      const response = await fetch('/api/dpi-tool/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // After successful signup, redirect to upscaler with the image
      setShowSignup(false);
      
      // Redirect to upscaler after successful signup
      const params = new URLSearchParams();
      params.append('imageUrl', encodeURIComponent(imagePreview));
      params.append('printWidth', printWidth);
      params.append('printHeight', printHeight);
      
      // Show success message
      setTimeout(() => {
        alert('Account created successfully! Check your email to verify your account.');
        router.push(`/process/upscale?${params.toString()}`);
      }, 500);

    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setSignupLoading(false);
    }
  };

  const getQualityBadge = (level: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-100 text-green-800 border-green-200',
      good: 'bg-blue-100 text-blue-800 border-blue-200',
      fair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      poor: 'bg-red-100 text-red-800 border-red-200'
    };

    const icons: Record<string, React.ReactNode> = {
      excellent: <CheckCircle className="w-4 h-4" />,
      good: <Info className="w-4 h-4" />,
      fair: <AlertCircle className="w-4 h-4" />,
      poor: <XCircle className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${colors[level]}`}>
        {icons[level]}
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Upload Section */}
      <Card className="p-8 mb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Image DPI</h2>
          <p className="text-gray-600">Upload your image and enter your desired print size to calculate DPI</p>
        </div>

        <div className="space-y-6">
          {/* Image Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#366494] transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            {imagePreview ? (
              <div>
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto mb-4 rounded" />
                <p className="text-sm text-gray-600">
                  Dimensions: {imageDimensions?.width} × {imageDimensions?.height} pixels
                </p>
                <label htmlFor="image-upload">
                  <span className="inline-block mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                    Change Image
                  </span>
                </label>
              </div>
            ) : (
              <label htmlFor="image-upload" className="cursor-pointer">
                <div>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700">Click to upload image</p>
                  <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 10MB</p>
                </div>
              </label>
            )}
          </div>

          {/* Print Size Inputs */}
          {imageDimensions && (
            <div>
              {/* Current DPI Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Image Information:</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {imageDimensions.width} × {imageDimensions.height} pixels
                    </p>
                    <p className="text-xs text-blue-600">
                      Optimal print size: {(imageDimensions.width / 300).toFixed(2)}" × {(imageDimensions.height / 300).toFixed(2)}" at 300 DPI
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const currentDPI = printWidth && printHeight 
                        ? Math.round(Math.min(imageDimensions.width / parseFloat(printWidth), imageDimensions.height / parseFloat(printHeight)))
                        : 300;
                      const quality = currentDPI >= 300 ? 'excellent' : currentDPI >= 200 ? 'good' : currentDPI >= 150 ? 'fair' : 'poor';
                      const colors = {
                        excellent: 'text-green-700',
                        good: 'text-blue-700',
                        fair: 'text-yellow-700',
                        poor: 'text-red-700'
                      };
                      
                      return (
                        <>
                          <p className={`text-3xl font-bold ${colors[quality]}`}>
                            {currentDPI} DPI
                          </p>
                          <p className={`text-xs ${colors[quality]} capitalize`}>
                            {quality} Quality
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Aspect Ratio Lock */}
              <div className="flex items-center justify-between mb-3">
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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Print Width (inches)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g., 11"
                    value={printWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Print Height (inches)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g., 14"
                    value={printHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common Print Sizes */}
          {imageDimensions && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Quick size presets:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Optimal (300 DPI)', width: imageDimensions.width / 300, height: imageDimensions.height / 300 },
                  { label: '8" × 10"', width: 8, height: 10 },
                  { label: '11" × 14"', width: 11, height: 14 },
                  { label: '12" × 15"', width: 12, height: 15 },
                  { label: '12" × 16"', width: 12, height: 16 }
                ].map(size => {
                  // Calculate what the DPI would be for this size
                  const wouldBeDPI = Math.round(Math.min(
                    imageDimensions.width / size.width,
                    imageDimensions.height / size.height
                  ));
                  
                  return (
                    <Button
                      key={size.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (size.label === 'Optimal (300 DPI)') {
                          setPrintWidth(size.width.toFixed(2));
                          setPrintHeight(size.height.toFixed(2));
                        } else if (maintainAspectRatio) {
                          // Fit to size while maintaining aspect ratio
                          const widthRatio = size.width / (imageDimensions.width / 300);
                          const heightRatio = size.height / (imageDimensions.height / 300);
                          const ratio = Math.min(widthRatio, heightRatio);
                          
                          const newWidth = (imageDimensions.width / 300) * ratio;
                          const newHeight = (imageDimensions.height / 300) * ratio;
                          
                          setPrintWidth(newWidth.toFixed(2));
                          setPrintHeight(newHeight.toFixed(2));
                        } else {
                          setPrintWidth(size.width.toString());
                          setPrintHeight(size.height.toString());
                        }
                      }}
                      className={`${wouldBeDPI < 150 ? 'border-red-300 hover:border-red-400' : wouldBeDPI < 300 ? 'border-yellow-300 hover:border-yellow-400' : ''}`}
                    >
                      {size.label}
                      {size.label !== 'Optimal (300 DPI)' && (
                        <span className={`ml-1 text-xs ${wouldBeDPI < 150 ? 'text-red-600' : wouldBeDPI < 300 ? 'text-yellow-600' : 'text-green-600'}`}>
                          ({wouldBeDPI} DPI)
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upscale Button with Quality Message */}
          {imageDimensions && printWidth && printHeight && (() => {
            const currentDPI = Math.round(Math.min(
              imageDimensions.width / parseFloat(printWidth), 
              imageDimensions.height / parseFloat(printHeight)
            ));
            const quality = currentDPI >= 300 ? 'excellent' : 
                          currentDPI >= 200 ? 'good' : 
                          currentDPI >= 150 ? 'fair' : 'poor';
            
            return (
              <div className="space-y-3">
                {currentDPI < 300 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <p className="text-yellow-800">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Your image is currently {currentDPI} DPI. We recommend upscaling to achieve 300 DPI for professional print quality.
                    </p>
                  </div>
                )}
                {currentDPI >= 300 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <p className="text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Your image already meets 300 DPI quality! Upscaling is optional.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleUpscaleClick}
                  className={`w-full ${currentDPI >= 300 ? 'bg-green-600 hover:bg-green-700' : 'bg-[#366494] hover:bg-[#233E5C]'}`}
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  {currentDPI >= 300 ? 'Process Image Anyway' : 'Upscale to 300 DPI'}
                </Button>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Signup Form Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowSignup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Create Your Free Account
              </h3>
              <p className="text-gray-600">
                Sign up to upscale your image and get 2 free credits for our AI tools
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="First Name *"
                  required
                  value={signupData.firstName}
                  onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                />
                <Input
                  placeholder="Last Name"
                  value={signupData.lastName}
                  onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                />
              </div>

              <Input
                type="email"
                placeholder="Email Address *"
                required
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
              />

              <Input
                type="password"
                placeholder="Password *"
                required
                minLength={6}
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
              />

              <Input
                type="tel"
                placeholder="Phone Number (optional)"
                value={signupData.phone}
                onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
              />

              {signupError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                  {signupError}
                </div>
              )}

              <Button
                type="submit"
                disabled={signupLoading}
                className="w-full bg-[#366494] hover:bg-[#233E5C]"
              >
                {signupLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Free Account & Continue'
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/signin')}
                  className="text-[#366494] hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          </Card>
        </div>
      )}

      {/* DPI Result */}
      {showResult && dpiResult && (
        <Card className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your DPI Results</h3>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-5xl font-bold text-[#366494]">
                {dpiResult.averageDPI}
              </div>
              <div className="text-left">
                <div className="text-2xl font-medium text-gray-700">DPI</div>
                {getQualityBadge(dpiResult.qualityLevel)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">{dpiResult.recommendation}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Detailed Results</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    Horizontal DPI: <span className="font-medium text-gray-900">{dpiResult.horizontalDPI}</span>
                  </p>
                  <p className="text-gray-600">
                    Vertical DPI: <span className="font-medium text-gray-900">{dpiResult.verticalDPI}</span>
                  </p>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Optimal Print Size</h4>
                <p className="text-sm text-gray-600">
                  For 300 DPI quality:{' '}
                  <span className="font-medium text-gray-900">
                    {dpiResult.printSizeAtOptimalDPI.width}" × {dpiResult.printSizeAtOptimalDPI.height}"
                  </span>
                </p>
              </div>
            </div>

            <div className={`${dpiResult.qualityLevel === 'excellent' ? 'bg-green-50' : 'bg-[#E88B4B]/10'} rounded-lg p-4 text-center`}>
              <p className="text-gray-700 mb-3">
                {dpiResult.qualityLevel === 'excellent' 
                  ? `Your image already meets 300 DPI for ${printWidth}" × ${printHeight}" printing!`
                  : `Need to improve your image quality for ${printWidth}" × ${printHeight}" printing?`
                }
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => {
                    // Send image and print dimensions to upscaler
                    const params = new URLSearchParams();
                    params.append('imageUrl', encodeURIComponent(imagePreview));
                    params.append('printWidth', printWidth);
                    params.append('printHeight', printHeight);
                    router.push(`/process/upscale?${params.toString()}`);
                  }}
                  className={dpiResult.qualityLevel === 'excellent' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#E88B4B] hover:bg-[#d67a3a]'}
                >
                  {dpiResult.qualityLevel === 'excellent' ? 'Process Anyway' : 'Upscale to 300 DPI'}
                </Button>
                {imagePreview && (
                  <Button
                    onClick={() => {
                      // Just send the image without dimensions to background removal
                      router.push(`/process/background-removal?imageUrl=${encodeURIComponent(imagePreview)}`);
                    }}
                    variant="outline"
                  >
                    Remove Background
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}