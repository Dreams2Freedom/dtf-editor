const fs = require('fs');

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Remove any existing SUPABASE_SERVICE_ROLE_KEY line
envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '');

// Add the complete service role key
const completeKey = 'eyJhbGciOiJIUzI1NiIsInR5CI6kpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6nh5c3V4aGRxdWtqdHFnemV0d3zIiwicm9ZSI6nNlcnZpY2fcm9ZSIsImlhdCI6MTc1U4NzM0OCwiZXhwIjoyMDY4MTYzMzQ4fQ.Xy2YKy7QDXQToQmNPb_Qvrs47dLk6QUhA';

envContent += `\nSUPABASE_SERVICE_ROLE_KEY=${completeKey}\n`;

// Write back to .env file
fs.writeFileSync('.env', envContent);
console.log('✅ Complete Supabase service role key added to .env file'); 