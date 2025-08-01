'use client';

import { useEffect } from 'react';

// This is as close as possible to the working test page
export default function TestCMMinimal() {
  useEffect(() => {
    // Create and inject the script element directly into the page
    const scriptContent = `
      function myCallback(opts) {
        console.log('ClippingMagic callback:', opts);
        switch (opts.event) {
          case "error":
              alert("An error occurred: " + opts.error.status + ", " + opts.error.code + ", " + opts.error.message);
              break;

          case "result-generated":
              alert("Generated a result for " + opts.image.id + ", " + opts.image.secret);
              console.log("Result generated:", opts);
              break;

          case "editor-exit":
              alert("The editor dialog closed");
              break;
        }
      }
      
      // Wait for ClippingMagic to load
      window.addEventListener('load', function() {
        if (typeof window.ClippingMagic !== 'undefined') {
          var errorsArray = window.ClippingMagic.initialize({apiId: 24469});
          
          if (errorsArray.length > 0) {
            alert("Sorry, your browser is missing some required features: \\n\\n " + errorsArray.join("\\n "));
          } else {
            console.log('ClippingMagic initialized successfully');
            window.cmReady = true;
          }
        } else {
          console.error('ClippingMagic script failed to load');
        }
      });
    `;

    const script = document.createElement('script');
    script.innerHTML = scriptContent;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      document.body.removeChild(script);
    };
  }, []);

  const openEditor = () => {
    if (window.cmReady && window.ClippingMagic) {
      console.log('Opening editor...');
      window.ClippingMagic.edit({
        "image": {
          "id": 207794051,
          "secret": "g5rssaot702277tqfdpufdmqjtkc2u8j9h9t7fhro879csnbmtv"
        },
        "useStickySettings": true,
        "hideBottomToolbar": false,
        "locale": "en-US"
      }, window.myCallback);
    } else {
      alert('ClippingMagic not ready yet');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ClippingMagic Minimal Test</h1>
      
      <button 
        onClick={openEditor}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Open Editor
      </button>

      <script src="https://clippingmagic.com/api/v1/ClippingMagic.js" type="text/javascript" />

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <p className="text-sm">This page loads ClippingMagic exactly like the working test page</p>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    ClippingMagic: any;
    cmReady: boolean;
    myCallback: (opts: any) => void;
  }
}