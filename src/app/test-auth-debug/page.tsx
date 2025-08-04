'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export default function TestAuthDebugPage() {
  const [envVars, setEnvVars] = useState<any>({});
  const [authResult, setAuthResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check environment variables
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
      hasBothVars: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    });
  }, []);

  const testAuth = async () => {
    setLoading(true);
    setAuthResult(null);

    try {
      const supabase = createClientSupabaseClient();
      
      // Test with a dummy email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      setAuthResult({
        success: !error,
        error: error?.message || null,
        errorCode: error?.code || null,
        errorStatus: error?.status || null,
        data: data ? 'User data received' : null
      });
    } catch (err: any) {
      setAuthResult({
        success: false,
        error: err.message || 'Unknown error',
        errorType: 'Exception'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSupabaseConnection = async () => {
    setLoading(true);
    try {
      const supabase = createClientSupabaseClient();
      
      // Try to get the session (should work even without auth)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      setAuthResult({
        connectionTest: true,
        sessionCheck: !error,
        error: error?.message || null,
        hasSession: !!session
      });
    } catch (err: any) {
      setAuthResult({
        connectionTest: false,
        error: err.message || 'Failed to connect to Supabase'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Auth Debug Page</h1>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Connection Tests</h2>
          <div className="space-y-4">
            <Button 
              onClick={checkSupabaseConnection} 
              disabled={loading}
              className="w-full"
            >
              Test Supabase Connection
            </Button>
            
            <Button 
              onClick={testAuth} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Test Authentication (with dummy credentials)
            </Button>
          </div>
        </Card>

        {authResult && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(authResult, null, 2)}
            </pre>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Info</h2>
          <div className="space-y-2 text-sm">
            <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</p>
            <p>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}