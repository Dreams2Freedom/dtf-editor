require('dotenv').config({ path: '.env.local' });

async function testBulkCreditsAPI() {
  try {
    // First, get an admin auth token
    const authResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: 'admin@example.com', // Replace with actual admin email
          password: 'password123', // Replace with actual admin password
        }),
      }
    );

    const authData = await authResponse.json();

    if (!authData.access_token) {
      console.error('Failed to authenticate:', authData);
      return;
    }

    // Get some test user IDs
    const usersResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?subscription_plan=eq.free&is_admin=eq.false&select=id,email,credits_remaining&limit=2`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authData.access_token}`,
        },
      }
    );

    const users = await usersResponse.json();
    console.log('Test users before:', users);

    if (!users || users.length < 2) {
      console.log('Not enough free users found');
      return;
    }

    const userIds = users.map(u => u.id);

    // Test the bulk credit API
    const response = await fetch(
      'http://localhost:3000/api/admin/users/bulk-credits',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${authData.access_token}; sb-refresh-token=${authData.refresh_token}`,
        },
        body: JSON.stringify({
          userIds,
          amount: 5,
          operation: 'add',
        }),
      }
    );

    const result = await response.json();
    console.log('\nAPI Response:', result);

    // Check the users again
    const checkResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.join(',')})&select=id,email,credits_remaining`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authData.access_token}`,
        },
      }
    );

    const updatedUsers = await checkResponse.json();
    console.log('\nTest users after:', updatedUsers);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Note: You'll need to update the admin email and password
console.log(
  'Note: Update the admin email and password in the script before running'
);
console.log('Current admin email is set to: admin@example.com');
testBulkCreditsAPI();
