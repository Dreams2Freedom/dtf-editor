const fs = require('fs');

// The complete service role key you provided
const correctKey =eyJhbGciOiJIUzI1NiIsInR5CI6kpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6nh5c3V4aGRxdWtqdHFnemV0d3zIiwicm9ZSI6nNlcnZpY2fcm9ZSIsImlhdCI6MTc1U4NzM0OCwiZXhwIjoyMDY4MTYzMzQ4fQ.Xy2YKy7QDXQToQmNPb_Qvrs47dLk6esaB_KQUhA';

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Remove any existing SUPABASE_SERVICE_ROLE_KEY line
envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '');

// Add the correct service role key
envContent += `SUPABASE_SERVICE_ROLE_KEY=${correctKey}\n`;

// Write back to .env file
fs.writeFileSync('.env', envContent);
console.log('✅ Updated SUPABASE_SERVICE_ROLE_KEY in .env file');
console.log('Key length:', correctKey.length, 'characters'); 