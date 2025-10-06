const fs = require('fs');
const path = require('path');

console.log('🔧 Credit System Fix Instructions\n');
console.log('The credit_transactions table is missing from your database.');
console.log('This is preventing credits from being added after payments.\n');

console.log('📋 To fix this issue:\n');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor (in the left sidebar)');
console.log('3. Create a new query');
console.log('4. Copy and paste the contents below');
console.log('5. Click "Run" to execute the SQL\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Read and display the SQL file
const sqlPath = path.join(__dirname, 'fix-credit-system.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
console.log(sql);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ After running this SQL:');
console.log('- The credit_transactions table will be created');
console.log(
  '- RLS policies will allow the service role to insert transactions'
);
console.log('- The add_user_credits function will work properly');
console.log('- Credits will be added after payments\n');

console.log('🔗 Direct link to SQL Editor:');
console.log(
  'https://supabase.com/dashboard/project/xysuxhdqukjtqgzetwps/sql/new'
);
