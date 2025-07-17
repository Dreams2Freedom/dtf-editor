require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function checkUserPassword() {
    console.log('Checking user password...');
    
    const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        
        // Get user with password hash
        const userResult = await client.query(
            'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
            ['snsmarketing@gmail.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            password_hash: user.password_hash ? 'SET' : 'NOT SET'
        });
        
        // Test common passwords
        const testPasswords = ['test123', 'password', 'admin123', '123456', 'password123'];
        
        for (const password of testPasswords) {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (isValid) {
                console.log(`✅ Password found: "${password}"`);
                break;
            }
        }
        
        // If no password found, offer to reset it
        console.log('\n🔧 To reset the password, run:');
        console.log('node reset-user-password.js');
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUserPassword(); 