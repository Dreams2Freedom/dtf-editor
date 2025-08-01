'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuthService } from '@/services/adminAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/lib/toast';
import { Shield, Smartphone, ArrowLeft } from 'lucide-react';

export default function Admin2FAPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check if we have a session that requires 2FA
    const session = adminAuthService.getSession();
    if (!session || !session.requires_2fa) {
      router.push('/admin/login');
    }
    
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [router]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all digits entered
    if (value && index === 5 && newCode.every(digit => digit)) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setCode(newCode);
      
      // Focus last input or next empty
      const lastFilledIndex = newCode.findIndex(digit => !digit) - 1;
      const focusIndex = lastFilledIndex === -2 ? 5 : lastFilledIndex + 1;
      inputRefs.current[focusIndex]?.focus();

      // Auto-submit if complete
      if (pastedData.length === 6) {
        handleSubmit(pastedData);
      }
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const codeToSubmit = fullCode || code.join('');
    
    if (codeToSubmit.length !== 6) {
      toast.error('Please enter a complete 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const session = adminAuthService.getSession();
      if (!session) {
        router.push('/admin/login');
        return;
      }

      const result = await adminAuthService.verify2FA({
        code: codeToSubmit,
        session_token: session.token
      });

      if (!result.success) {
        toast.error(result.error || 'Invalid code');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success('2FA verification successful');
      router.push('/admin');
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-blue text-white rounded-lg mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-gray-600 mt-2">Enter the 6-digit code from your authenticator app</p>
        </div>

        {/* 2FA Form */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Authenticator Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-12 h-12 text-gray-600" />
              </div>
            </div>

            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 text-center mb-4">
                Verification Code
              </label>
              <div className="flex justify-center space-x-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => handleSubmit()}
              variant="primary"
              className="w-full"
              disabled={isLoading || code.some(digit => !digit)}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            {/* Back Link */}
            <button
              onClick={() => {
                adminAuthService.logout();
                router.push('/admin/login');
              }}
              className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to login</span>
            </button>
          </div>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Open your authenticator app and enter the current code.</p>
          <p className="mt-2">
            Lost access?{' '}
            <a href="/support" className="text-primary-blue hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}