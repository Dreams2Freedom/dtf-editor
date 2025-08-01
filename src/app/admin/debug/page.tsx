'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminDebugPage() {
  const [cookies, setCookies] = useState<string>('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [networkLogs, setNetworkLogs] = useState<string[]>([]);

  useEffect(() => {
    // Check cookies
    setCookies(document.cookie);

    // Try to parse admin_session cookie
    const adminSessionCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('admin_session='));
    
    if (adminSessionCookie) {
      try {
        const value = decodeURIComponent(adminSessionCookie.split('=')[1]);
        setSessionData(JSON.parse(value));
      } catch (e) {
        setSessionData({ error: 'Failed to parse session', details: e });
      }
    }

    // Log current state
    console.log('Debug Page Loaded');
    console.log('Cookies:', document.cookie);
    console.log('Location:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
  }, []);

  const testRedirect = async (method: string) => {
    const log = `Testing ${method} redirect...`;
    setNetworkLogs(prev => [...prev, log]);
    console.log(log);

    switch (method) {
      case 'router.push':
        // Would need to import router - skipping for now
        setNetworkLogs(prev => [...prev, 'router.push not available in this context']);
        break;
      case 'window.location.href':
        window.location.href = '/admin';
        break;
      case 'window.location.replace':
        window.location.replace('/admin');
        break;
      case 'window.location.assign':
        window.location.assign('/admin');
        break;
      case 'meta refresh':
        const meta = document.createElement('meta');
        meta.httpEquiv = 'refresh';
        meta.content = '0; url=/admin';
        document.head.appendChild(meta);
        setNetworkLogs(prev => [...prev, 'Meta refresh tag added']);
        break;
    }
  };

  const testCookieSet = () => {
    // Test setting a simple cookie
    document.cookie = 'test_cookie=test_value; path=/';
    setCookies(document.cookie);
    setNetworkLogs(prev => [...prev, 'Set test_cookie']);
  };

  const testApiCall = async () => {
    setNetworkLogs(prev => [...prev, 'Testing API call...']);
    
    try {
      const response = await fetch('/api/admin/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      setNetworkLogs(prev => [...prev, `API Response: ${JSON.stringify(data)}`]);
    } catch (error) {
      setNetworkLogs(prev => [...prev, `API Error: ${error}`]);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Admin Debug Page</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cookie Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-semibold">All Cookies:</p>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {cookies || 'No cookies found'}
            </pre>
            
            <p className="font-semibold mt-4">Admin Session Data:</p>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {sessionData ? JSON.stringify(sessionData, null, 2) : 'No admin_session cookie found'}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Redirect Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => testRedirect('window.location.href')}>
              window.location.href
            </Button>
            <Button onClick={() => testRedirect('window.location.replace')}>
              window.location.replace
            </Button>
            <Button onClick={() => testRedirect('window.location.assign')}>
              window.location.assign
            </Button>
            <Button onClick={() => testRedirect('meta refresh')}>
              Meta Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cookie Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button onClick={testCookieSet}>Test Cookie Set</Button>
            <Button onClick={testApiCall}>Test API Call</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-2 rounded h-48 overflow-auto">
            {networkLogs.map((log, i) => (
              <div key={i} className="text-sm font-mono">{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}