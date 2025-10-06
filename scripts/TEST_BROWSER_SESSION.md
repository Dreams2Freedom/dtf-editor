# Test Browser Session

## Problem

The affiliate admin page shows "permission denied" because the Supabase client can't access the auth session.

## Test in Browser Console

Open the browser console on the affiliate applications page (`/admin/affiliates/applications`) and run:

```javascript
// Test 1: Check if Supabase client can get session
const { createClientSupabaseClient } = await import(
  '/src/lib/supabase/client.ts'
);
const supabase = createClientSupabaseClient();

const {
  data: { session },
  error,
} = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user?.email);
console.log('Error:', error);

// Test 2: Try to fetch affiliates
const { data: affiliates, error: affError } = await supabase
  .from('affiliates')
  .select('*');

console.log('Affiliates:', affiliates);
console.log('Error:', affError);

// Test 3: Check user's profile
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', session?.user?.id)
  .single();

console.log('Profile:', profile);
console.log('is_admin:', profile?.is_admin);
```

## Expected Results

If session is working:

- Session: should show user object with email
- User: shannon@s2transfers.com
- Affiliates: should show array of 3 affiliates
- is_admin: true

If session is NOT working:

- Session: null
- Error: "Auth session missing"
- Affiliates error: "permission denied"
