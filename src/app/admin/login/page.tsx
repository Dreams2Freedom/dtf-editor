'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from '@/lib/toast';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const { user, isAdmin, signIn, initialize } = useAuthStore();

  // Check if already logged in as admin
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Admin login page - checking auth...');
      await initialize();

      const state = useAuthStore.getState();
      console.log('Auth state:', {
        user: state.user?.email,
        isAdmin: state.isAdmin,
        profile: state.profile,
      });

      if (state.user && state.isAdmin) {
        // Already logged in as admin, redirect to dashboard
        console.log('User is admin, redirecting...');
        router.push('/admin');
      } else if (state.user && !state.isAdmin) {
        // Logged in but not admin
        console.log('User is not admin, redirecting to dashboard...');
        toast.error('You do not have admin privileges');
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router, initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn(formData.email, formData.password);

      if (!result.success) {
        toast.error(result.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      // Wait a moment for the store to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Re-initialize to get fresh data
      await initialize();

      // Check if user is admin
      const store = useAuthStore.getState();
      if (!store.isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        setIsLoading(false);
        return;
      }

      // Login successful
      toast.success('Login successful! Redirecting...');

      // Redirect to admin dashboard
      setTimeout(() => {
        router.push('/admin');
      }, 500);
    } catch (error) {
      toast.error('Unable to connect to server. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
      suppressHydrationWarning
    >
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Image
            src="/logo-horizontal.png"
            alt="DTF Editor"
            width={180}
            height={50}
            className="h-14 w-auto mx-auto mb-6"
            priority
          />
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <Shield className="w-6 h-6 text-primary-blue" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          </div>
          <p className="text-gray-600">Sign in to access the admin dashboard</p>
        </div>

        {/* Login Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Security Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium">Restricted Access</p>
                <p className="text-amber-700">
                  This area is for authorized administrators only.
                </p>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="pl-10"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="pl-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="default"
              fullWidth
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in to Admin Portal'}
            </Button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Not an admin?{' '}
              <a href="/login" className="text-primary-blue hover:underline">
                Go to regular login
              </a>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Admin access is monitored and logged for security purposes.</p>
          <p className="mt-1">All actions are subject to audit.</p>
        </div>
      </div>
    </div>
  );
}
