'use client';

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface SessionInfo {
  hasSession: boolean;
  userEmail?: string;
  userId?: string;
  error?: unknown;
}

interface ProfileInfo {
  data?: {
    is_admin?: boolean;
    email?: string;
    full_name?: string;
  };
  error?: unknown;
}

export default function CheckSessionPage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [affiliatesCount, setAffiliatesCount] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    async function checkSession() {
      try {
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        setSessionInfo({
          hasSession: !!session,
          userEmail: session?.user?.email,
          userId: session?.user?.id,
          error: sessionError
        });

        if (session?.user?.id) {
          // Check profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setProfileInfo({
            data: profile,
            error: profileError
          });

          // Try to count affiliates
          const { count, error: countError } = await supabase
            .from('affiliates')
            .select('*', { count: 'exact', head: true });

          setAffiliatesCount(count);
          if (countError) {
            setError(countError);
          }
        }
      } catch (err) {
        setError(err);
      }
    }

    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Diagnostics</h1>

      {/* Session Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold">Has Session:</span>
              <span className={sessionInfo?.hasSession ? 'text-green-600' : 'text-red-600'}>
                {sessionInfo?.hasSession ? '✅ YES' : '❌ NO'}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Email:</span>
              <span>{sessionInfo?.userEmail || 'Not logged in'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">User ID:</span>
              <span className="font-mono text-xs">{sessionInfo?.userId || 'N/A'}</span>
            </div>
            {sessionInfo?.error && (
              <div className="text-red-600">
                <span className="font-semibold">Session Error:</span> {sessionInfo.error.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          {profileInfo?.data ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="font-semibold">Is Admin:</span>
                <span className={profileInfo.data.is_admin ? 'text-green-600' : 'text-red-600'}>
                  {profileInfo.data.is_admin ? '✅ YES' : '❌ NO'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold">Full Name:</span>
                <span>{profileInfo.data.full_name || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold">Email:</span>
                <span>{profileInfo.data.email}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              {sessionInfo?.hasSession ? 'Loading profile...' : 'Not logged in'}
            </div>
          )}
          {profileInfo?.error && (
            <div className="text-red-600 mt-2">
              <span className="font-semibold">Profile Error:</span> {profileInfo.error.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affiliates Access */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Affiliates Table Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold">Can Query Affiliates:</span>
              <span className={affiliatesCount !== null ? 'text-green-600' : 'text-red-600'}>
                {affiliatesCount !== null ? '✅ YES' : '❌ NO'}
              </span>
            </div>
            {affiliatesCount !== null && (
              <div className="flex gap-2">
                <span className="font-semibold">Affiliates Count:</span>
                <span>{affiliatesCount}</span>
              </div>
            )}
            {error && (
              <div className="text-red-600 mt-2">
                <div className="font-semibold">Error Details:</div>
                <div className="text-sm mt-1">Message: {error.message}</div>
                <div className="text-sm">Code: {error.code}</div>
                {error.details && <div className="text-sm">Details: {error.details}</div>}
                {error.hint && <div className="text-sm">Hint: {error.hint}</div>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Action Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            {!sessionInfo?.hasSession && (
              <li className="text-red-600 font-semibold">
                ❌ You are NOT logged in. Go to <a href="/auth/login" className="text-blue-600 underline">/auth/login</a>
              </li>
            )}
            {sessionInfo?.hasSession && sessionInfo?.userEmail !== 'Shannon@S2Transfers.com' && (
              <li className="text-orange-600 font-semibold">
                ⚠️ You are logged in as {sessionInfo.userEmail}. The primary admin is Shannon@S2Transfers.com
              </li>
            )}
            {sessionInfo?.hasSession && !profileInfo?.data?.is_admin && (
              <li className="text-red-600 font-semibold">
                ❌ Your profile does not have admin access. Contact system administrator.
              </li>
            )}
            {sessionInfo?.hasSession && profileInfo?.data?.is_admin && error && (
              <li className="text-red-600 font-semibold">
                ❌ RLS policies may be blocking access. Run FIX_AFFILIATE_ADMIN_ACCESS_NOW.sql in Supabase
              </li>
            )}
            {sessionInfo?.hasSession && profileInfo?.data?.is_admin && !error && (
              <li className="text-green-600 font-semibold">
                ✅ Everything looks good! You should be able to access affiliate data.
              </li>
            )}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
