'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function AuthDebugPage() {
  const [email, setEmail] = useState('shannonherod@gmail.com');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [envInfo, setEnvInfo] = useState<any>({});

  useEffect(() => {
    // Check environment on mount
    const checkEnvironment = () => {
      const info = {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? 'SET'
          : 'NOT SET',
        currentUrl:
          typeof window !== 'undefined' ? window.location.href : 'SSR',
        cookies:
          typeof document !== 'undefined'
            ? document.cookie.split('; ').map(c => c.split('=')[0])
            : [],
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      };
      setEnvInfo(info);
      addLog('Environment checked');
    };

    checkEnvironment();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testDirectAuth = async () => {
    addLog('Testing direct Supabase auth...');

    try {
      const supabase = createClientSupabaseClient();
      addLog('Supabase client created');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        addLog(`Auth error: ${error.message} (${error.status})`);
      } else {
        addLog(`Auth success! User: ${data.user?.email}`);
        addLog(`Session: ${data.session ? 'Created' : 'No session'}`);

        // Check cookies after auth
        if (typeof document !== 'undefined') {
          const authCookies = document.cookie
            .split('; ')
            .filter(c => c.includes('sb-') || c.includes('supabase'));
          addLog(
            `Auth cookies: ${authCookies.length > 0 ? authCookies.join(', ') : 'None found'}`
          );
        }
      }
    } catch (err) {
      addLog(
        `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const testCookies = async () => {
    addLog('Testing cookie functionality...');

    try {
      // Test setting a cookie
      const testCookieValue = `test_${Date.now()}`;
      document.cookie = `debug_test=${testCookieValue}; path=/; secure; samesite=lax`;
      addLog(`Set test cookie: debug_test=${testCookieValue}`);

      // Check if it was set
      const cookieSet = document.cookie.includes(
        `debug_test=${testCookieValue}`
      );
      addLog(`Cookie verification: ${cookieSet ? 'SUCCESS' : 'FAILED'}`);

      // Test API cookie endpoint
      const response = await fetch('/api/test-cookie', {
        credentials: 'include',
      });
      const data = await response.json();
      addLog(`API cookie test: ${data.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (err) {
      addLog(
        `Cookie test error: ${err instanceof Error ? err.message : 'Unknown'}`
      );
    }
  };

  const clearAllData = () => {
    // Clear cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
    }

    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    addLog('Cleared all cookies, localStorage, and sessionStorage');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Production Auth Debug</h1>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Info</h2>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(envInfo, null, 2)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Test Authentication</h2>
          <div className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
            />
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password (use: TestPassword123!)"
            />
            <div className="flex gap-2">
              <Button onClick={testDirectAuth}>Test Auth</Button>
              <Button onClick={testCookies} variant="outline">
                Test Cookies
              </Button>
              <Button
                onClick={clearAllData}
                variant="outline"
                className="text-red-600"
              >
                Clear All Data
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs max-h-96 overflow-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
