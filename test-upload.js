const SupabaseStorage = require('./supabase-storage');

async function testUpload() {
    console.log('Testing Supabase Storage upload functionality...');
    
    try {
        // Create a test file buffer
        const testContent = 'This is a test file for Supabase Storage';
        const fileBuffer = Buffer.from(testContent, 'utf8');
        
        console.log('1. Testing file upload...');
        const uploadResult = await SupabaseStorage.uploadFile(
            'test-user',
            'test-file.txt',
            fileBuffer,
            'text/plain',
            'test'
        );
        
        console.log('✅ Upload successful:', uploadResult);
        
        // Test public URL
        console.log('\n2. Testing public URL...');
        const publicUrl = SupabaseStorage.getPublicUrl(uploadResult.path);
        console.log('✅ Public URL:', publicUrl);
        
        // Test signed URL
        console.log('\n3. Testing signed URL...');
        const signedUrl = await SupabaseStorage.createSignedUrl(uploadResult.path, 3600);
        console.log('✅ Signed URL:', signedUrl);
        
        // Test file download
        console.log('\n4. Testing file download...');
        const downloadedBuffer = await SupabaseStorage.downloadFile(uploadResult.path);
        console.log('✅ Download successful, content:', downloadedBuffer.toString());
        
        // Test file deletion
        console.log('\n5. Testing file deletion...');
        await SupabaseStorage.deleteFile(uploadResult.path);
        console.log('✅ File deleted successfully');
        
        console.log('\n🎉 All Supabase Storage tests passed!');
        console.log('Your cloud storage integration is working perfectly!');      
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUpload(); 