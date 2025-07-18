require('dotenv').config();
const { dbHelpers, initializeDatabase } = require('./database-postgres');

async function debugImages() {
    console.log('=== DEBUG: Image Saving Issue ===');
    
    try {
        // 1. Test database connection
        console.log('\n1. Testing database connection...');
        await initializeDatabase();
        console.log('✅ Database connection successful');
        
        // 2. Check total images in database
        console.log('\n2. Checking total images in database...');
        const client = await dbHelpers.getClient();
        const totalResult = await client.query('SELECT COUNT(*) as count FROM images');
        console.log(`Total images in database: ${totalResult.rows[0].count}`);
        
        // 3. Get recent images
        console.log('\n3. Getting recent images...');
        const recentResult = await client.query(`
            SELECT id, user_id, original_filename, image_type, tool_used, created_at 
            FROM images 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log(`Recent images (${recentResult.rows.length}):`);
        recentResult.rows.forEach(img => {
            console.log(`  - ID: ${img.id}, User: ${img.user_id}, Type: ${img.image_type}, Tool: ${img.tool_used}, Created: ${img.created_at}`);
        });
        
        // 4. Check users
        console.log('\n4. Checking users...');
        const usersResult = await client.query('SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5');
        console.log(`Recent users (${usersResult.rows.length}):`);
        usersResult.rows.forEach(user => {
            console.log(`  - ID: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
        });
        
        // 5. Check images for each user
        console.log('\n5. Checking images per user...');
        for (const user of usersResult.rows) {
            const userImagesResult = await client.query('SELECT COUNT(*) as count FROM images WHERE user_id = $1', [user.id]);
            console.log(`  - User ${user.id} (${user.email}): ${userImagesResult.rows[0].count} images`);
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        console.error('Error details:', error.message);
    }
}

debugImages().then(() => {
    console.log('\n=== DEBUG COMPLETE ===');
    process.exit(0);
}).catch(error => {
    console.error('Debug script failed:', error);
    process.exit(1);
});