'use client';

import { ImageProcessor } from '@/components/image/ImageProcessor';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect } from 'react';

export default function ProcessTestClient() {
  const { user } = useAuthStore();

  // Initialize ClippingMagic like the test page
  useEffect(() => {
    const scriptContent = `
      window.cmCallback = function(opts) {
        console.log('ClippingMagic callback:', opts);
        switch (opts.event) {
          case "error":
            alert("An error occurred: " + opts.error.status + ", " + opts.error.code + ", " + opts.error.message);
            break;
          case "result-generated":
            alert("Generated a result for " + opts.image.id + ", " + opts.image.secret);
            break;
          case "editor-exit":
            alert("The editor dialog closed");
            break;
        }
      };
      
      window.addEventListener('load', function() {
        if (typeof window.ClippingMagic !== 'undefined') {
          var errorsArray = window.ClippingMagic.initialize({apiId: 24469});
          if (errorsArray.length > 0) {
            alert("Sorry, your browser is missing some required features: \\n\\n " + errorsArray.join("\\n "));
          } else {
            console.log('ClippingMagic initialized successfully');
            window.cmReady = true;
          }
        }
      });
    `;

    const script = document.createElement('script');
    script.innerHTML = scriptContent;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">
                DTF Editor - Test
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link href="/process" className="text-blue-600 font-medium">
                  Process
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Pricing
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <ImageProcessor />
      </main>

      <Script
        src="https://clippingmagic.com/api/v1/ClippingMagic.js"
        strategy="afterInteractive"
      />
    </div>
  );
}

declare global {
  interface Window {
    ClippingMagic: any;
    cmReady: boolean;
    cmCallback: (opts: any) => void;
  }
}
