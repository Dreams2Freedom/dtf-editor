const fetch = require('node-fetch');

async function testPortal() {
  try {
    const response = await fetch('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
        returnUrl: 'http://localhost:3000/dashboard'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPortal();