'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';

export default function TestAffiliatePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      // Try to fetch affiliates
      const { data: affiliates, error: err } = await supabase
        .from('affiliates')
        .select('*');

      setData(affiliates);
      setError(err);
    }

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Affiliate Debug Test</h1>

      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h2 className="font-bold">Current User:</h2>
        <pre className="text-sm">{JSON.stringify(user, null, 2)}</pre>
      </div>

      <div className="mb-4 p-4 bg-success-50 rounded">
        <h2 className="font-bold">Affiliates Data:</h2>
        {error ? (
          <div className="text-error-600">
            Error: {error.message}
            <br />
            Code: {error.code}
            <br />
            Details: {error.details}
          </div>
        ) : (
          <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h2 className="font-bold">Summary:</h2>
        <p>User Email: {user?.email}</p>
        <p>User ID: {user?.id}</p>
        <p>Affiliates Found: {data?.length || 0}</p>
        <p>Has Error: {error ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
