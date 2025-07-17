require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function resetUserPassword() {
    console.log('Resetting user password...');
    
    const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        
        // Hash the new password
        const newPassword = 'pl$A9jNvpu4Duj4Fs9S8';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update the user's password
        const result = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
            [passwordHash, 'snsmarketing@gmail.com']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Password reset successfully');
            console.log(`User: ${result.rows[0].email}`);
            console.log(`New password: ${newPassword}`);
            console.log('\nYou can now login with:');
            console.log(`Email: snsmarketing@gmail.com`);
            console.log(`Password: ${newPassword}`);
        } else {
            console.log('❌ User not found');
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

resetUserPassword(); 