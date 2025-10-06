'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';

const AdminDebugPage = () => {
  const router = useRouter();
  const [cookies, setCookies] = useState<string>('');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      setCookies(document.cookie);

      // Check for admin session
      const adminSessionCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_session='));

      setSessionInfo({
        hasCookie: !!adminSessionCookie,
        cookieValue: adminSessionCookie || 'Not found',
        allCookies: document.cookie || 'No cookies',
      });
    }
  }, []);

  const testNavigation = (method: string) => {
    if (typeof window === 'undefined') return;

    console.log(`Testing navigation with: ${method}`);
    console.log('Cookies:', document.cookie);
    console.log('Location:', window.location.href);
    console.log('User Agent:', navigator.userAgent);

    switch (method) {
      case 'router':
        router.push('/admin');
        break;
      case 'location':
        window.location.href = '/admin';
        break;
      case 'replace':
        window.location.replace('/admin');
        break;
      case 'assign':
        window.location.assign('/admin');
        break;
      case 'meta':
        if (typeof document !== 'undefined') {
          const meta = document.createElement('meta');
          meta.httpEquiv = 'refresh';
          meta.content = '0; url=/admin';
          document.head.appendChild(meta);
        }
        break;
    }
  };

  const setCookieTest = () => {
    if (typeof document === 'undefined') return;
    document.cookie = 'test_cookie=test_value; path=/';
    setCookies(document.cookie);
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin Debug Page</h1>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Cookie Information</h2>
          <div className="space-y-2">
            <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
              {cookies || 'No cookies found'}
            </p>
            <Button
              onClick={() => {
                if (typeof document !== 'undefined') {
                  setCookies(document.cookie);
                }
              }}
              size="sm"
            >
              Refresh Cookies
            </Button>
            <Button onClick={setCookieTest} size="sm" className="ml-2">
              Set Test Cookie
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Session Debug Info</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Navigation Tests</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => testNavigation('router')}>
              Test Router.push
            </Button>
            <Button onClick={() => testNavigation('location')}>
              Test location.href
            </Button>
            <Button onClick={() => testNavigation('replace')}>
              Test location.replace
            </Button>
            <Button onClick={() => testNavigation('assign')}>
              Test location.assign
            </Button>
            <Button onClick={() => testNavigation('meta')}>
              Test Meta Refresh
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Browser Info</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(
              {
                userAgent:
                  typeof navigator !== 'undefined'
                    ? navigator.userAgent
                    : 'N/A',
                href:
                  typeof window !== 'undefined' ? window.location.href : 'N/A',
                protocol:
                  typeof window !== 'undefined'
                    ? window.location.protocol
                    : 'N/A',
                host:
                  typeof window !== 'undefined' ? window.location.host : 'N/A',
                pathname:
                  typeof window !== 'undefined'
                    ? window.location.pathname
                    : 'N/A',
              },
              null,
              2
            )}
          </pre>
        </Card>
      </div>
    </div>
  );
};

// Export with SSR disabled
export default dynamic(() => Promise.resolve(AdminDebugPage), {
  ssr: false,
});
