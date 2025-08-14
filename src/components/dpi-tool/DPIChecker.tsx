'use client';

import { useState, useCallback } from 'react';
import { Upload, Calculator, AlertCircle, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';
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
  const [isCalculating, setIsCalculating] = useState(false);
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
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      alert('Error reading image. Please try another file.');
    }
  }, []);

  const calculateDPIResult = useCallback(() => {
    if (!imageDimensions || !printWidth || !printHeight) {
      alert('Please upload an image and enter print dimensions');
      return;
    }

    const width = parseFloat(printWidth);
    const height = parseFloat(printHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      alert('Please enter valid print dimensions');
      return;
    }

    setIsCalculating(true);

    // Simulate calculation delay for effect
    setTimeout(() => {
      const result = calculateDPI({
        imageWidth: imageDimensions.width,
        imageHeight: imageDimensions.height,
        printWidth: width,
        printHeight: height
      });

      setDpiResult(result);
      setIsCalculating(false);

      // If user is not logged in and signup is enabled, show signup form
      if (!user && showSignupForm) {
        setShowSignup(true);
      } else {
        setShowResult(true);
      }
    }, 1500);
  }, [imageDimensions, printWidth, printHeight, user, showSignupForm]);

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

      // Show success and reveal DPI result
      setShowSignup(false);
      setShowResult(true);
      
      if (onSignupComplete) {
        onSignupComplete();
      }

      // Show success message
      setTimeout(() => {
        alert('Account created successfully! Check your email to verify your account.');
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
            <label htmlFor="image-upload" className="cursor-pointer">
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto mb-4 rounded" />
                  <p className="text-sm text-gray-600">
                    Dimensions: {imageDimensions?.width} × {imageDimensions?.height} pixels
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Image
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700">Click to upload image</p>
                  <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </label>
          </div>

          {/* Print Size Inputs */}
          {imageDimensions && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Print Width (inches)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 11"
                  value={printWidth}
                  onChange={(e) => setPrintWidth(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Print Height (inches)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 14"
                  value={printHeight}
                  onChange={(e) => setPrintHeight(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Common Print Sizes */}
          {imageDimensions && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Common DTF print sizes:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '8" × 10"', width: 8, height: 10 },
                  { label: '11" × 14"', width: 11, height: 14 },
                  { label: '12" × 15"', width: 12, height: 15 },
                  { label: '12" × 16"', width: 12, height: 16 }
                ].map(size => (
                  <Button
                    key={size.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrintWidth(size.width.toString());
                      setPrintHeight(size.height.toString());
                    }}
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Calculate Button */}
          {imageDimensions && printWidth && printHeight && (
            <Button
              onClick={calculateDPIResult}
              disabled={isCalculating}
              className="w-full bg-[#366494] hover:bg-[#233E5C]"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calculating DPI...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  Calculate DPI
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Signup Form Modal */}
      {showSignup && dpiResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-8 relative">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Create Your Free Account
              </h3>
              <p className="text-gray-600">
                Sign up to see your DPI results and get 2 free credits for our AI tools
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
                  'Create Free Account & See Results'
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

            {dpiResult.qualityLevel !== 'excellent' && (
              <div className="bg-[#E88B4B]/10 rounded-lg p-4 text-center">
                <p className="text-gray-700 mb-3">
                  Need to improve your image quality?
                </p>
                <Button
                  onClick={() => router.push('/process/upscale')}
                  className="bg-[#E88B4B] hover:bg-[#d67a3a]"
                >
                  Try Our AI Upscaler
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}