require('dotenv').config();

console.log('Current Supabase configuration:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

// Extract project reference from SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl) {
    const projectRef = supabaseUrl.split('//')[1].split('.')[0];
    console.log('\nProject reference:', projectRef);
    
    console.log('\nTo get your database connection string:');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef);
    console.log('2. Navigate to: Settings → Database');
    console.log('3. Copy the "Connection string" (URI format)');
    console.log('\nOr construct it manually:');
    console.log('SUPABASE_DB_URL=postgresql://postgres:[YOUR-DB-PASSWORD]@db.' + projectRef + '.supabase.co:5432/postgres');
    
    console.log('\nYou need to add SUPABASE_DB_URL to your .env file with the correct password.');
    console.log('The password is NOT the same as your service role key.');
} 