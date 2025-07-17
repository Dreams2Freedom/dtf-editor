require('dotenv').config();
const { Pool } = require('pg');

async function testConnection(connectionString, description) {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`Connection: ${connectionString.replace(/:[^:@]*@/, ':****@')}`);
    
    const pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log(`✅ SUCCESS: ${description}`);
        
        // Test a simple query
        const result = await client.query('SELECT current_database(), current_user');
        console.log(`Database: ${result.rows[0].current_database}`);
        console.log(`User: ${result.rows[0].current_user}`);
        
        client.release();
        await pool.end();
        return true;
    } catch (error) {
        console.log(`❌ FAILED: ${description}`);
        console.log(`Error: ${error.message}`);
        await pool.end();
        return false;
    }
}

async function testAllConnections() {
    const password = 'HJzmh38xUiaFcV3C';
    const projectRef = 'xysuxhdqukjtqgzetwps';
    
    const connections = [
        {
            string: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
            desc: 'Standard db. format'
        },
        {
            string: `postgresql://postgres:${password}@${projectRef}.supabase.co:5432/postgres`,
            desc: 'Main URL format'
        },
        {
            string: `postgresql://postgres:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
            desc: 'Pooler format (from your env)'
        },
        {
            string: `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
            desc: 'Pooler with project ref in username'
        }
    ];
    
    console.log('Testing different Supabase connection formats...\n');
    
    for (const conn of connections) {
        const success = await testConnection(conn.string, conn.desc);
        if (success) {
            console.log('\n🎉 Found working connection!');
            console.log(`Use this in your .env file:`);
            console.log(`SUPABASE_DB_URL=${conn.string}`);
            return;
        }
    }
    
    console.log('\n❌ None of the connection formats worked.');
    console.log('Please check your Supabase dashboard for the correct connection string.');
}

testAllConnections(); 