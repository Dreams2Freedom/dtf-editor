const fs = require('fs');

// The complete service role key you provided
const correctKey =eyJhbGciOiJIUzI1NiIsInR5cCI6kpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6nh5c3V4aGRxdWtqdHFnemV0d3BzIiwicm9ZSI6InNlcnZpY2Vfcm9ZSIsImlhdCI6MTc1U4NzM0OCwiZXhwIjoyMDY4MTYzMzQ4fQ.Xy2YKy7QDXQToQmNPb_Qvrs47dLk6esaB_KQUhA';

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Remove any existing SUPABASE_SERVICE_ROLE_KEY line
envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '');

// Add the correct service role key
envContent += `SUPABASE_SERVICE_ROLE_KEY=${correctKey}\n`;

// Write back to .env file
fs.writeFileSync('.env', envContent);
console.log('✅ Correct Supabase service role key set in .env file');
console.log('Key length:', correctKey.length, 'characters'); 