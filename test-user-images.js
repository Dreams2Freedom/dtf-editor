require('dotenv').config();
const { Pool } = require('pg');

async function testUserImages() {
    console.log('Testing user images functionality...');
    
    const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to database');
        
        // Test 1: Check if user exists
        const userResult = await client.query(
            'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
            ['snsmarketing@gmail.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ User found:', user);
        
        // Test 2: Check current images for this user
        const imagesResult = await client.query(
            'SELECT * FROM images WHERE user_id = $1 ORDER BY created_at DESC',
            [user.id]
        );
        
        console.log(`📊 User has ${imagesResult.rows.length} images:`);
        imagesResult.rows.forEach((image, index) => {
            console.log(`  ${index + 1}. ${image.original_filename} (${image.image_type}) - ${image.tool_used} - ${new Date(image.created_at).toLocaleString()}`);
        });
        
        // Test 3: Check images table structure
        const tableResult = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'images' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Images table structure:');
        tableResult.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Test 4: Try to insert a test image
        console.log('\n🧪 Testing image insertion...');
        const testImageData = {
            user_id: user.id,
            original_filename: 'test_image.jpg',
            processed_filename: 'test_vectorized.svg',
            storage_path: 'test/path/to/image.svg',
            file_size: 1024,
            image_type: 'vectorization',
            tool_used: 'vectorizer',
            credits_used: 1,
            processing_time_ms: 1500
        };
        
        const insertResult = await client.query(`
            INSERT INTO images (user_id, original_filename, processed_filename, storage_path, file_size, image_type, tool_used, credits_used, processing_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            testImageData.user_id,
            testImageData.original_filename,
            testImageData.processed_filename,
            testImageData.storage_path,
            testImageData.file_size,
            testImageData.image_type,
            testImageData.tool_used,
            testImageData.credits_used,
            testImageData.processing_time_ms
        ]);
        
        console.log('✅ Test image inserted with ID:', insertResult.rows[0].id);
        
        // Test 5: Verify the image was saved
        const verifyResult = await client.query(
            'SELECT * FROM images WHERE id = $1',
            [insertResult.rows[0].id]
        );
        
        if (verifyResult.rows.length > 0) {
            console.log('✅ Image verification successful:', verifyResult.rows[0]);
        } else {
            console.log('❌ Image verification failed');
        }
        
        // Test 6: Clean up test image
        await client.query('DELETE FROM images WHERE id = $1', [insertResult.rows[0].id]);
        console.log('🧹 Test image cleaned up');
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

testUserImages(); 