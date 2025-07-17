require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    console.log('Testing database connection...');
    console.log('SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? 'SET' : 'NOT SET');
    
    if (!process.env.SUPABASE_DB_URL) {
        console.error('SUPABASE_DB_URL not set in .env file');
        return;
    }

    const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to Supabase database successfully');
        
        // Test query to check if user exists
        const result = await client.query(
            'SELECT id, email, first_name, last_name, is_active FROM users WHERE email = $1',
            ['snsmarketing@gmail.com']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ User found:', result.rows[0]);
        } else {
            console.log('❌ User not found in database');
            
            // List all users to see what's in the database
            const allUsers = await client.query('SELECT id, email, first_name, last_name FROM users LIMIT 10');
            console.log('Users in database:', allUsers.rows);
        }
        
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    } finally {
        await pool.end();
    }
}

testConnection(); 