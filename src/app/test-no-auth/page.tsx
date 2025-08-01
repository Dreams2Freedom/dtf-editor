'use client';

export default function TestNoAuth() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page - No Auth</h1>
      <p>This page has no authentication imports to test if the redirect loop is auth-related.</p>
      
      <div className="mt-4 space-y-2">
        <a href="/dashboard" className="block text-blue-600 hover:underline">Go to Dashboard</a>
        <a href="/process" className="block text-blue-600 hover:underline">Go to Process</a>
        <a href="/test-clippingmagic" className="block text-blue-600 hover:underline">Go to ClippingMagic Test</a>
      </div>
    </div>
  );
}