'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { Sparkles, Check, X } from 'lucide-react';
import Link from 'next/link';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export function SignupModal({
  isOpen,
  onClose,
  feature = 'this feature',
}: SignupModalProps) {
  const { signUp, signIn } = useAuthStore();
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const result = await signUp(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Failed to sign up');
        }

        // Close modal on successful signup
        onClose();
      } else {
        const result = await signIn(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Failed to sign in');
        }

        // Close modal on successful login
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {isSignup ? 'Start Creating with AI' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            {isSignup
              ? `Sign up to unlock ${feature} and get 2 free credits every month!`
              : `Log in to continue using ${feature}`}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits for signup */}
        {isSignup && (
          <div className="bg-[#366494]/5 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-[#366494] mb-2">
              Free Account Includes:
            </p>
            <ul className="space-y-1">
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />2 free credits
                every month
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Access to all AI tools
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                48-hour image storage
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                No credit card required
              </li>
            </ul>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={
                isSignup ? 'At least 6 characters' : 'Enter your password'
              }
              required
            />
          </div>

          {isSignup && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#366494] hover:bg-[#233E5C] text-white"
          >
            {isLoading ? (
              'Processing...'
            ) : isSignup ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Free Account
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Toggle between signup and login */}
        <div className="text-center mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError(null);
                setPassword('');
                setConfirmPassword('');
              }}
              className="ml-1 text-[#366494] hover:text-[#233E5C] font-medium"
            >
              {isSignup ? 'Log in' : 'Sign up free'}
            </button>
          </p>
        </div>

        {/* Privacy and Terms */}
        <p className="text-xs text-center text-gray-500 mt-4">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-[#366494] hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-[#366494] hover:underline">
            Privacy Policy
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
