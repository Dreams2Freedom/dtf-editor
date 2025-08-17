'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/Button';
import { captureException, captureMessage, trackAPIError, setUserContext } from '@/lib/sentry';

export default function TestSentryPage() {
  const [testResult, setTestResult] = useState<string>('');

  const testClientError = () => {
    try {
      throw new Error('Test client-side error from Sentry test page');
    } catch (error) {
      captureException(error, {
        tags: { test: 'true', location: 'client' },
        extra: { timestamp: new Date().toISOString() },
        level: 'error',
      });
      setTestResult('Client error sent to Sentry');
    }
  };

  const testAPIError = async () => {
    try {
      const response = await fetch('/api/test-sentry-error');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      trackAPIError('/api/test-sentry-error', error, 500);
      setTestResult('API error sent to Sentry');
    }
  };

  const testMessage = () => {
    captureMessage('Test info message from Sentry test page', 'info', {
      tags: { test: 'true' },
      extra: { source: 'test-page' },
    });
    setTestResult('Info message sent to Sentry');
  };

  const testUserContext = () => {
    setUserContext({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
      subscription: 'pro',
    });
    captureMessage('Test message with user context', 'info');
    setTestResult('Message with user context sent to Sentry');
  };

  const testUnhandledRejection = () => {
    // This will trigger a global error handler
    setTimeout(() => {
      throw new Error('Test unhandled rejection');
    }, 100);
    setTestResult('Unhandled rejection triggered - check Sentry dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Sentry Error Monitoring Test</h1>
        
        {process.env.NODE_ENV === 'production' && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <strong>Warning:</strong> This page is for testing only and should not be accessible in production.
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="w-32">Sentry DSN:</span>
              <span className={process.env.NEXT_PUBLIC_SENTRY_DSN ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✓ Configured' : '✗ Not configured'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-32">Environment:</span>
              <span>{process.env.NODE_ENV}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Error Reporting</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button onClick={testClientError} variant="outline">
              Test Client Error
            </Button>
            
            <Button onClick={testAPIError} variant="outline">
              Test API Error
            </Button>
            
            <Button onClick={testMessage} variant="outline">
              Test Info Message
            </Button>
            
            <Button onClick={testUserContext} variant="outline">
              Test User Context
            </Button>
            
            <Button onClick={testUnhandledRejection} variant="outline" className="border-red-500 text-red-500">
              Test Unhandled Rejection
            </Button>
            
            <Button 
              onClick={() => {
                // This will trigger the error boundary
                throw new Error('Test error boundary');
              }} 
              variant="outline" 
              className="border-red-500 text-red-500"
            >
              Test Error Boundary
            </Button>
          </div>

          {testResult && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              {testResult}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click any test button to send an error to Sentry</li>
              <li>Check your Sentry dashboard to verify the error was received</li>
              <li>Errors should appear in real-time in the Sentry interface</li>
              <li>The "Unhandled Rejection" and "Error Boundary" tests will cause actual errors</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}