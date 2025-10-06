'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';

export default function TestLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { signIn: storeSignIn } = useAuthStore();

  const testDirectAuth = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Test direct auth service
      const authResult = await authService.signIn(email, password);

      setResult({
        method: 'Direct AuthService',
        success: !authResult.error,
        error: authResult.error?.message || null,
        errorCode: authResult.error?.code || null,
        hasUser: !!authResult.user,
        userId: authResult.user?.id || null,
        email: authResult.user?.email || null,
      });
    } catch (err: any) {
      setResult({
        method: 'Direct AuthService',
        success: false,
        error: err.message,
        exception: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const testStoreAuth = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Test through auth store
      const storeResult = await storeSignIn(email, password);

      setResult({
        method: 'Auth Store',
        ...storeResult,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setResult({
        method: 'Auth Store',
        success: false,
        error: err.message,
        exception: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseDirectly = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { createClientSupabaseClient } = await import(
        '@/lib/supabase/client'
      );
      const supabase = createClientSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setResult({
        method: 'Direct Supabase',
        success: !error,
        error: error?.message || null,
        errorCode: error?.code || null,
        errorStatus: error?.status || null,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        userId: data?.user?.id || null,
        email: data?.user?.email || null,
      });
    } catch (err: any) {
      setResult({
        method: 'Direct Supabase',
        success: false,
        error: err.message,
        exception: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Test Login Methods</h1>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Login Credentials</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Test Methods</h2>
          <div className="space-y-4">
            <Button
              onClick={testSupabaseDirectly}
              disabled={loading || !email || !password}
              className="w-full"
            >
              Test Direct Supabase Auth
            </Button>

            <Button
              onClick={testDirectAuth}
              disabled={loading || !email || !password}
              variant="outline"
              className="w-full"
            >
              Test Auth Service
            </Button>

            <Button
              onClick={testStoreAuth}
              disabled={loading || !email || !password}
              variant="outline"
              className="w-full"
            >
              Test Auth Store
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Test Result</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
}
