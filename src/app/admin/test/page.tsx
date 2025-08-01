'use client';

import { useState, useEffect } from 'react';
import { adminAuthService } from '@/services/adminAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminTestPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [cookieInfo, setCookieInfo] = useState<any>(null);

  useEffect(() => {
    checkSession();
    checkCookies();
  }, []);

  const checkSession = () => {
    const session = adminAuthService.getSession();
    const localStorageSession = localStorage.getItem('admin_session');
    const sessionStorageSession = sessionStorage.getItem('admin_session');
    
    setSessionInfo({
      hasSession: !!session,
      sessionData: session,
      localStorage: localStorageSession ? 'Found' : 'Not found',
      sessionStorage: sessionStorageSession ? 'Found' : 'Not found',
      localStorageSize: localStorageSession ? localStorageSession.length : 0,
      sessionStorageSize: sessionStorageSession ? sessionStorageSession.length : 0
    });
  };

  const checkCookies = async () => {
    try {
      const response = await fetch('/api/admin/test-cookie');
      const data = await response.json();
      setCookieInfo(data);
    } catch (error) {
      setCookieInfo({ error: 'Failed to check cookies' });
    }
  };

  const setCookie = async () => {
    try {
      const response = await fetch('/api/admin/test-cookie', { method: 'POST' });
      const data = await response.json();
      alert(JSON.stringify(data, null, 2));
      checkCookies();
    } catch (error) {
      alert('Failed to set test cookie');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin Debug Page</h1>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Session Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Cookie Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(cookieInfo, null, 2)}
          </pre>
          <Button onClick={setCookie} className="mt-4">
            Set Test Cookie
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Browser Info</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify({
              cookies: document.cookie || 'No cookies visible to JavaScript',
              userAgent: navigator.userAgent,
              location: {
                href: window.location.href,
                protocol: window.location.protocol,
                host: window.location.host,
                pathname: window.location.pathname,
                search: window.location.search
              }
            }, null, 2)}
          </pre>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => { checkSession(); checkCookies(); }}>
            Refresh Info
          </Button>
          <Button onClick={() => window.location.href = '/admin'}>
            Go to Admin Dashboard
          </Button>
          <Button onClick={() => window.location.href = '/admin/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}