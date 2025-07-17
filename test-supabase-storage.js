const SupabaseStorage = require('./supabase-storage');

async function testSupabaseStorage() {
    console.log('Testing Supabase Storage connection...');
    
    try {
        // Test 1eck if we can list files (should work even if bucket is empty)
        console.log('\n1. Testing file listing...');
        const files = await SupabaseStorage.listUserFiles('test-user');
        console.log('✅ File listing works:', files);
        
        // Test 2lic URL generation
        console.log('\n2. Testing public URL generation...');
        const testPath = 'test-user/test-file.png';
        const publicUrl = SupabaseStorage.getPublicUrl(testPath);
        console.log('✅ Public URL generation works:', publicUrl);
        
        // Test 3ned URL generation
        console.log('\n3. Testing signed URL generation...');
        const signedUrl = await SupabaseStorage.createSignedUrl(testPath, 3600);
        console.log('✅ Signed URL generation works:', signedUrl);
        
        console.log('\n🎉 All Supabase Storage tests passed!');
        console.log('Your Supabase Storage integration is working correctly.');      
    } catch (error) {    
        console.error('❌ Supabase Storage test failed:', error.message);
        console.error('Please check your environment variables and bucket configuration.');
    }
}

// Run the test
testSupabaseStorage(); 