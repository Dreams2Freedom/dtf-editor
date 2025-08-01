'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NavTestPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testNavigation = async () => {
    addLog('Starting navigation tests...');

    // Test 1: router.push
    try {
      addLog('Test 1: router.push("/admin")');
      router.push('/admin');
    } catch (err) {
      addLog(`Test 1 failed: ${err}`);
    }

    // Test 2: window.location.href
    setTimeout(() => {
      try {
        addLog('Test 2: window.location.href = "/admin"');
        window.location.href = '/admin';
      } catch (err) {
        addLog(`Test 2 failed: ${err}`);
      }
    }, 1000);

    // Test 3: window.location.replace
    setTimeout(() => {
      try {
        addLog('Test 3: window.location.replace("/admin")');
        window.location.replace('/admin');
      } catch (err) {
        addLog(`Test 3 failed: ${err}`);
      }
    }, 2000);

    // Test 4: window.open
    setTimeout(() => {
      try {
        addLog('Test 4: window.open("/admin", "_self")');
        window.open('/admin', '_self');
      } catch (err) {
        addLog(`Test 4 failed: ${err}`);
      }
    }, 3000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Navigation Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testNavigation}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test All Navigation Methods
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Manual Navigation Links:</h2>
          <a href="/admin" className="text-blue-600 hover:underline block">
            Regular link to /admin
          </a>
          <a href="/admin" target="_self" className="text-blue-600 hover:underline block">
            Link with target="_self" to /admin
          </a>
          <button
            onClick={() => window.location.href = '/admin'}
            className="text-blue-600 hover:underline block text-left"
          >
            Button with window.location.href
          </button>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold mb-2">Logs:</h2>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}