require('dotenv').config();
const { Pool } = require('pg');

// Test database connection and image saving
async function testImageSave() {
    console.log('Testing image save functionality...');
    
    // Test database connection
    const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Database connection successful');
        
        // Test getting user images
        const result = await client.query('SELECT COUNT(*) as count FROM images');
        console.log('✅ Total images in database:', result.rows[0].count);
        
        // Test getting recent images
        const recentImages = await client.query(`
            SELECT id, user_id, original_filename, processed_filename, image_type, tool_used, created_at 
            FROM images 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log('✅ Recent images:');
        recentImages.rows.forEach(img => {
            console.log(`  - ID: ${img.id}, User: ${img.user_id}, Type: ${img.image_type}, Tool: ${img.tool_used}, Created: ${img.created_at}`);
        });
        
        // Test getting images for a specific user (replace with actual user ID)
        const testUserId = 1; // Replace with actual user ID from your database
        const userImages = await client.query(`
            SELECT id, original_filename, processed_filename, image_type, tool_used, created_at 
            FROM images 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [testUserId]);
        
        console.log(`✅ Images for user ${testUserId}:`, userImages.rows.length);
        userImages.rows.forEach(img => {
            console.log(`  - ID: ${img.id}, Type: ${img.image_type}, Tool: ${img.tool_used}, Created: ${img.created_at}`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        await pool.end();
    }
}

testImageSave(); 