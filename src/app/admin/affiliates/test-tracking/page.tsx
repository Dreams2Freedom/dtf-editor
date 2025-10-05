'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import {
  MousePointerClick,
  UserPlus,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Database
} from 'lucide-react';

export default function TestTrackingPage() {
  const [testEmail, setTestEmail] = useState('');
  const [referralCode, setReferralCode] = useState('SNSMAR');
  const [cookieValue, setCookieValue] = useState('');
  const [testResults, setTestResults] = useState<Array<{
    timestamp: string;
    test: string;
    action: string;
    url?: string;
    data?: unknown;
    status: string;
  }>>([]);

  // Check current cookies
  const checkCookies = () => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    setCookieValue(JSON.stringify(cookies, null, 2));

    if (cookies.dtf_ref || cookies.dtf_ref_code) {
      toast.success('Affiliate cookies found!');
    } else {
      toast.error('No affiliate cookies set');
    }
  };

  // Test 1: Simulate click tracking
  const testClickTracking = async () => {
    try {
      const testUrl = `${window.location.origin}/?ref=${referralCode}`;

      // Open in new tab
      window.open(testUrl, '_blank');

      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        test: 'Click Tracking',
        action: 'Opened referral link in new tab',
        url: testUrl,
        status: 'pending'
      }]);

      toast.success('Referral link opened! Check cookies in new tab.');
    } catch (error) {
      console.error('Click tracking test error:', error);
      toast.error('Failed to test click tracking');
    }
  };

  // Test 2: Check database for recent visits
  const checkRecentVisits = async () => {
    try {
      const response = await fetch(`/api/admin/affiliates/test-tracking/visits?code=${referralCode}`);

      if (!response.ok) {
        throw new Error('Failed to fetch visits');
      }

      const data = await response.json();

      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        test: 'Database Check',
        action: 'Fetched recent visits',
        data: data.visits,
        status: 'success'
      }]);

      toast.success(`Found ${data.visits?.length || 0} recent visits`);
    } catch (error) {
      console.error('Database check error:', error);
      toast.error('Failed to check database');
    }
  };

  // Test 3: Check referrals for code
  const checkReferrals = async () => {
    try {
      const response = await fetch(`/api/admin/affiliates/test-tracking/referrals?code=${referralCode}`);

      if (!response.ok) {
        throw new Error('Failed to fetch referrals');
      }

      const data = await response.json();

      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        test: 'Referrals Check',
        action: 'Fetched referrals',
        data: data.referrals,
        status: 'success'
      }]);

      toast.success(`Found ${data.referrals?.length || 0} referrals`);
    } catch (error) {
      console.error('Referrals check error:', error);
      toast.error('Failed to check referrals');
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const clearResults = () => {
    setTestResults([]);
    toast.success('Results cleared');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Affiliate Tracking Test Tool</h1>
        <p className="text-gray-600">
          Test click tracking, signup tracking, and verify data is being stored correctly
        </p>
      </div>

      {/* Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Referral Code to Test
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="SNSMAR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Email (for signup test)
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="test@example.com"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Referral Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${referralCode}`}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
              />
              <Button onClick={copyReferralLink} variant="secondary">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Test 1: Click Tracking */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <MousePointerClick className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="font-semibold">Test Click Tracking</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Opens referral link in new tab and sets tracking cookies
            </p>
            <Button onClick={testClickTracking} className="w-full mb-2">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Referral Link
            </Button>
            <Button onClick={checkCookies} variant="secondary" className="w-full">
              Check Cookies
            </Button>
          </CardContent>
        </Card>

        {/* Test 2: Check Database */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-success-600 mr-2" />
              <h3 className="font-semibold">Check Database</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Verify clicks are being stored in referral_visits table
            </p>
            <Button onClick={checkRecentVisits} className="w-full mb-2">
              Check Recent Visits
            </Button>
            <Button onClick={checkReferrals} variant="secondary" className="w-full">
              Check Referrals
            </Button>
          </CardContent>
        </Card>

        {/* Test 3: Signup Flow */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <UserPlus className="h-6 w-6 text-purple-600 mr-2" />
              <h3 className="font-semibold">Test Signup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manual test: Sign up with tracking cookie set
            </p>
            <Button
              onClick={() => window.open('/auth/signup', '_blank')}
              className="w-full"
            >
              Open Signup Page
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              After clicking referral link, create a test account
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Cookies Display */}
      {cookieValue && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Cookies</span>
              <Button onClick={checkCookies} size="sm" variant="secondary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
              {cookieValue}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <Button onClick={clearResults} size="sm" variant="secondary">
                Clear Results
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold">{result.test}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {result.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-success-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.action}</p>
                  {result.url && (
                    <p className="text-xs text-blue-600 break-all">{result.url}</p>
                  )}
                  {result.data && (
                    <pre className="bg-gray-50 p-2 rounded text-xs mt-2 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">1. Test Click Tracking:</h4>
              <ol className="list-decimal ml-5 space-y-1 text-gray-600">
                <li>Click &quot;Open Referral Link&quot; to open the referral URL in a new tab</li>
                <li>In the new tab, click &quot;Check Cookies&quot; to verify dtf_ref and dtf_ref_code are set</li>
                <li>Click &quot;Check Recent Visits&quot; to see if the visit was recorded in the database</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Test Signup Tracking:</h4>
              <ol className="list-decimal ml-5 space-y-1 text-gray-600">
                <li>First, click &quot;Open Referral Link&quot; to set tracking cookies</li>
                <li>Then click &quot;Open Signup Page&quot; to create a test account</li>
                <li>After signup, click &quot;Check Referrals&quot; to verify the referral was created</li>
                <li>Check the affiliate dashboard to see the new signup appear</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Verify in Admin Dashboard:</h4>
              <ol className="list-decimal ml-5 space-y-1 text-gray-600">
                <li>Go to Admin → Affiliates → Overview</li>
                <li>Check that Total Clicks incremented</li>
                <li>Check that Total Signups incremented (if you completed signup test)</li>
                <li>View the affiliate&apos;s details to see visit and referral records</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
