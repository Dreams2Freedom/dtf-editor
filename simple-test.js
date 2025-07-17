const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('Testing Supabase connection...');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

console.log('Environment variables found');
console.log('URL length:', process.env.SUPABASE_URL.length);
console.log('Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
    try {
        console.log('\n1. Testing basic connection...');
        
        // Test basic connection by trying to list buckets
        const { data: buckets, error: bucketError } = await supabase
            .storage
            .listBuckets();
        
        if (bucketError) {
            console.error('❌ Bucket listing error:', bucketError);
            return;
        }
        
        console.log('✅ Connection successful!');
        console.log('Available buckets:', buckets.map(b => b.name));
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
    }
}

testConnection(); 