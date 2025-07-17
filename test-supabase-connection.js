const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('Testing Supabase connection...');
console.log('SUPABASE_URL:, process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY length:, process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : NOT SET');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

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
        
        // Check if user-images bucket exists
        const userImagesBucket = buckets.find(b => b.name === 'user-images');
        if (!userImagesBucket) {
            console.log('⚠️  user-images bucket not found. Available buckets:', buckets.map(b => b.name));
            return;
        }
        
        console.log('✅ user-images bucket found!');
        
        // Test listing files in the bucket
        console.log('\n2. Testing file listing in user-images bucket...');
        const { data: files, error: fileError } = await supabase
            .storage
            .from('user-images')
            .list('');
        
        if (fileError) {
            console.error('❌ File listing error:', fileError);
            return;
        }
        
        console.log('✅ File listing successful!');
        console.log('Files in bucket:', files);
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
    }
}

testConnection(); 