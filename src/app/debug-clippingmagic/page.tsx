'use client';

import { useEffect, useState } from 'react';

export default function DebugClippingMagic() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    // Check if ClippingMagic exists
    addLog(`Initial check - window.ClippingMagic exists: ${!!window.ClippingMagic}`);

    // Load script
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.onload = () => {
      addLog('Script loaded');
      addLog(`window.ClippingMagic type: ${typeof window.ClippingMagic}`);
      addLog(`window.ClippingMagic.initialize exists: ${!!window.ClippingMagic?.initialize}`);
      addLog(`window.ClippingMagic.edit exists: ${!!window.ClippingMagic?.edit}`);
      
      // Initialize
      if (window.ClippingMagic) {
        const errors = window.ClippingMagic.initialize({ apiId: 24469 });
        addLog(`Initialize errors: ${JSON.stringify(errors)}`);
        
        // Check what's in ClippingMagic object
        addLog(`ClippingMagic properties: ${Object.keys(window.ClippingMagic).join(', ')}`);
        
        // Try to inspect the edit function
        addLog(`edit function: ${window.ClippingMagic.edit.toString().substring(0, 100)}...`);
      }
    };
    document.body.appendChild(script);
  }, []);

  const testEdit = () => {
    addLog('Testing edit function...');
    if (window.ClippingMagic && window.ClippingMagic.edit) {
      try {
        // Use a test image ID from earlier
        window.ClippingMagic.edit({
          image: { 
            id: 207794051,
            secret: "g5rssaot702277tqfdpufdmqjtkc2u8j9h9t7fhro879csnbmtv"
          },
          useStickySettings: true,
          hideBottomToolbar: false,
          locale: 'en-US'
        }, (opts: any) => {
          addLog(`Callback: ${JSON.stringify(opts)}`);
        });
        addLog('edit() called successfully');
      } catch (e) {
        addLog(`edit() error: ${e}`);
      }
    } else {
      addLog('ClippingMagic.edit not available');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ClippingMagic Debug</h1>
      
      <button 
        onClick={testEdit}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Test ClippingMagic.edit()
      </button>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Logs:</h2>
        <pre className="text-xs whitespace-pre-wrap">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </pre>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="font-semibold">Check browser console for:</p>
        <ul className="list-disc list-inside text-sm">
          <li>Any errors when clicking the test button</li>
          <li>Whether a popup window opens</li>
          <li>Any iframe-related errors</li>
        </ul>
      </div>
    </div>
  );
}