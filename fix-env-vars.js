const fs = require('fs');

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Remove any existing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY lines
envContent = envContent.replace(/SUPABASE_URL=.*\n?/g, '');
envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '');

// Add the correct environment variables
envContent += `SUPABASE_URL=https://xysuxhdqukjtqgzetwps.supabase.co\n`;
envContent += `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6kpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6nh5c3V4aGRxdWtqdHFnemV0d3BzIiwicm9ZSI6InNlcnZpY2Vfcm9ZSIsImlhdCI6MTc1U4NzM0OCwiZXhwIjoyMDY4MTYzMzQ4fQ.Xy2YKy7QDXQToQmNPb_Qvrs47GWdLk6esaB_KQUhA\n`;

// Write back to .env file
fs.writeFileSync('.env', envContent);
console.log('✅ Fixed SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file'); 