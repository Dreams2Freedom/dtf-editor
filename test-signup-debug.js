const fetch = require('node-fetch');

async function testSignup() {
  const timestamp = Date.now();
  const testEmail = `testuser${timestamp}@example.com`;
  
  console.log('Testing signup with email:', testEmail);
  console.log('Making request to: http://localhost:3001/api/auth/signup');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        metadata: {
          firstName: 'Test',
          lastName: 'User',
          company: 'Test Company'
        }
      })
    });
    
    const data = await response.json();
    console.log('\nResponse status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ Signup successful!');
      console.log('Check server logs for email sending details');
    } else {
      console.log('\n❌ Signup failed:', data.error);
    }
  } catch (error) {
    console.error('Error during signup test:', error);
  }
}

// Wait a bit for server to be ready
setTimeout(() => {
  testSignup();
}, 3000);