'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function TestNavigationPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold mb-4">Navigation Test Page</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 1: Simple Navigation</h2>
            <Button
              onClick={() => {
                console.log('Test 1: Simple navigation to /process');
                router.push('/process');
              }}
            >
              Navigate to /process
            </Button>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 2: Background Removal (No Params)</h2>
            <Button
              onClick={() => {
                console.log('Test 2: Navigate to background removal without params');
                router.push('/process/background-removal');
              }}
            >
              Navigate to Background Removal
            </Button>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 3: Background Removal with Simple URL</h2>
            <Button
              onClick={() => {
                const url = '/process/background-removal?imageUrl=https://example.com/test.jpg';
                console.log('Test 3: Navigate with simple URL:', url);
                router.push(url);
              }}
            >
              Navigate with Simple URL
            </Button>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 4: Background Removal with Encoded URL</h2>
            <Button
              onClick={() => {
                const imageUrl = 'https://example.com/test.jpg';
                const url = `/process/background-removal?imageUrl=${encodeURIComponent(imageUrl)}`;
                console.log('Test 4: Navigate with encoded URL:', url);
                router.push(url);
              }}
            >
              Navigate with Encoded URL
            </Button>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 5: Window.location.href</h2>
            <Button
              onClick={() => {
                const url = '/process/background-removal?imageUrl=https://example.com/test.jpg';
                console.log('Test 5: Using window.location.href:', url);
                window.location.href = url;
              }}
            >
              Use window.location.href
            </Button>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 6: Data URL (Small)</h2>
            <Button
              onClick={() => {
                // Small 1x1 pixel transparent PNG
                const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
                const url = `/process/background-removal?imageUrl=${encodeURIComponent(dataUrl)}`;
                console.log('Test 6: Navigate with data URL, length:', url.length);
                router.push(url);
              }}
            >
              Navigate with Small Data URL
            </Button>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-semibold mb-2">Test 7: Use Link Component</h2>
            <a 
              href="/process/background-removal?imageUrl=https://example.com/test.jpg"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Use Regular Anchor Tag
            </a>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
          <h3 className="font-semibold">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open browser console (F12)</li>
            <li>Click each test button</li>
            <li>Check console for logs</li>
            <li>Note which ones work and which fail</li>
            <li>Check if any specific error messages appear</li>
          </ol>
        </div>
      </div>
    </div>
  );
}