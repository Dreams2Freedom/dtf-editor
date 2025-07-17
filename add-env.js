const fs = require('fs');

const envContent = `
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6kpXVCJ9eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6nh5c3V4aGRxdWtqdHFnemV0d3BzIiwicm9ZSI6InNlcnZpY2Vfcm9ZSIsImlhdCI6MTc1U4NzM0OCwiZXhwIjoyMDY4MTYzMzQ4fQ.Xy2YKy7QDXQToQmNPb_Qvrs47Lk6QUhA
`;

fs.appendFileSync('.env', envContent);
console.log('✅ Supabase service role key added to .env file'); 