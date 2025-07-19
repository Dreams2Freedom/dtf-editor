const { dbHelpers, initializeDatabase } = require('./database-postgres');

async function directFixCredits() {
    try {
        await initializeDatabase();
        const client = await dbHelpers.getClient();
        
        console.log('🔧 Direct Credit Fix Starting...\n');
        
        // Fix snsmarketing@gmail.com user
        console.log('👤 Fixing snsmarketing@gmail.com...');
        await client.query(`
            UPDATE users 
            SET 
                credits_remaining = -28,
                credits_used = 38,
                total_credits_purchased = 10,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = 'snsmarketing@gmail.com'
        `);
        console.log('✅ Updated snsmarketing@gmail.com');
        
        // Fix newuser@example.com
        console.log('👤 Fixing newuser@example.com...');
        await client.query(`
            UPDATE users 
            SET 
                credits_remaining = 0,
                credits_used = 0,
                total_credits_purchased = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = 'newuser@example.com'
        `);
        console.log('✅ Updated newuser@example.com');
        
        // Fix test@example.com
        console.log('👤 Fixing test@example.com...');
        await client.query(`
            UPDATE users 
            SET 
                credits_remaining = 10,
                credits_used = 0,
                total_credits_purchased = 10,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = 'test@example.com'
        `);
        console.log('✅ Updated test@example.com');
        
        // Fix admin@dtfeditor.com
        console.log('👤 Fixing admin@dtfeditor.com...');
        await client.query(`
            UPDATE users 
            SET 
                credits_remaining = -4,
                credits_used = 4,
                total_credits_purchased = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = 'admin@dtfeditor.com'
        `);
        console.log('✅ Updated admin@dtfeditor.com');
        
        client.release();
        
        console.log('\n🎉 Direct credit fix completed!');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

directFixCredits(); 