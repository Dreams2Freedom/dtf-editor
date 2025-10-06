'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export default function TestAuthPage() {
  const { user, session, loading } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiDebugInfo, setApiDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Get client-side auth info
    const checkAuth = async () => {
      const supabase = createClientSupabaseClient();
      const {
        data: { session: clientSession },
      } = await supabase.auth.getSession();
      const {
        data: { user: clientUser },
      } = await supabase.auth.getUser();

      setDebugInfo({
        storeUser: !!user,
        storeSession: !!session,
        storeLoading: loading,
        clientSession: !!clientSession,
        clientUser: !!clientUser,
        localStorage: {
          hasSupabaseAuth: !!localStorage.getItem('supabase.auth.token'),
        },
        cookies: document.cookie,
      });
    };

    checkAuth();
  }, [user, session, loading]);

  const testDebugEndpoint = async () => {
    try {
      const response = await fetch('/api/debug-auth', {
        credentials: 'include',
      });
      const data = await response.json();
      setApiDebugInfo(data);
    } catch (error) {
      setApiDebugInfo({ error: String(error) });
    }
  };

  const testProcessEndpoint = async () => {
    try {
      const formData = new FormData();
      formData.append('operation', 'upscale');
      formData.append(
        'image',
        new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      );

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();
      alert(`Process API Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`Process API Error: ${error}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>

      <div className="space-y-6">
        {/* Client-side info */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Client-Side Auth Info:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* API debug info */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">API Debug Info:</h2>
          <button
            onClick={testDebugEndpoint}
            className="mb-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Debug Endpoint
          </button>
          {apiDebugInfo && (
            <pre className="text-xs overflow-auto">
              {JSON.stringify(apiDebugInfo, null, 2)}
            </pre>
          )}
        </div>

        {/* Test process endpoint */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Test Process Endpoint:</h2>
          <button
            onClick={testProcessEndpoint}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Test Process API
          </button>
        </div>

        {/* Current user info */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Current User:</h2>
          <p>Email: {user?.email || 'Not logged in'}</p>
          <p>ID: {user?.id || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
