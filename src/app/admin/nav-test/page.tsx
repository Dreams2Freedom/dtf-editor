'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const AdminNavTestPage = () => {
  const router = useRouter();
  const [result, setResult] = useState<string>('');

  const testNextRouter = () => {
    setResult('Using Next.js router.push...');
    router.push('/admin');
  };

  const testNextRouterReplace = () => {
    setResult('Using Next.js router.replace...');
    router.replace('/admin');
  };

  const testWindowLocation = () => {
    if (typeof window === 'undefined') return;
    setResult('Using window.location.href...');
    window.location.href = '/admin';
  };

  const testLocationReplace = () => {
    if (typeof window === 'undefined') return;
    setResult('Using window.location.replace...');
    window.location.replace('/admin');
  };

  const testWindowOpen = () => {
    if (typeof window === 'undefined') return;
    setResult('Using window.open...');
    window.open('/admin', '_self');
  };

  const testMeta = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    setResult('Using meta refresh...');
    const meta = document.createElement('meta');
    meta.httpEquiv = 'refresh';
    meta.content = '0; url=/admin';
    document.head.appendChild(meta);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Admin Navigation Test</h1>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Navigation Methods</h2>
          
          <div className="space-y-4">
            <div>
              <Button onClick={testNextRouter} className="w-full">
                Test Next.js Router Push
              </Button>
            </div>
            
            <div>
              <Button onClick={testNextRouterReplace} className="w-full">
                Test Next.js Router Replace
              </Button>
            </div>
            
            <div>
              <Button onClick={testWindowLocation} className="w-full">
                Test window.location.href
              </Button>
            </div>
            
            <div>
              <Button onClick={testLocationReplace} className="w-full">
                Test window.location.replace
              </Button>
            </div>
            
            <div>
              <Button onClick={testWindowOpen} className="w-full">
                Test window.open
              </Button>
            </div>
            
            <div>
              <Button onClick={testMeta} className="w-full">
                Test Meta Refresh
              </Button>
            </div>
            
            <div>
              <Link href="/admin" className="block">
                <Button className="w-full">
                  Test Next.js Link Component
                </Button>
              </Link>
            </div>
          </div>
          
          {result && (
            <div className="mt-6 p-4 bg-gray-100 rounded">
              <p className="text-sm">{result}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// Export with SSR disabled
export default dynamic(() => Promise.resolve(AdminNavTestPage), {
  ssr: false
});