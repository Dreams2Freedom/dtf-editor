const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
let dbConfig;

if (process.env.SUPABASE_DB_URL) {
    dbConfig = {
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false },
    };
} else if (process.env.DATABASE_URL) {
    dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
} else {
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'dtf_editor',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
}

async function fixCredits() {
    const pool = new Pool(dbConfig);
    
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        
        // Check current credit distribution
        console.log('\nCurrent credit distribution:');
        const creditDistribution = await client.query(`
            SELECT credits_remaining, subscription_plan, COUNT(*) as user_count
            FROM users 
            GROUP BY credits_remaining, subscription_plan
            ORDER BY credits_remaining, subscription_plan
        `);
        
        creditDistribution.rows.forEach(row => {
            console.log(`${row.credits_remaining} credits (${row.subscription_plan}): ${row.user_count} users`);
        });
        
        // Find users with 5 credits who should have 2
        console.log('\nFinding users with incorrect credits...');
        const usersWith5Credits = await client.query(`
            SELECT id, email, credits_remaining, subscription_plan
            FROM users 
            WHERE credits_remaining = 5 AND subscription_plan = 'free'
        `);
        
        console.log(`Found ${usersWith5Credits.rows.length} users with 5 credits who should have 2:`);
        usersWith5Credits.rows.forEach(user => {
            console.log(`- ${user.email} (ID: ${user.id})`);
        });
        
        if (usersWith5Credits.rows.length > 0) {
            console.log('\nFixing credits...');
            
            // Update users with 5 credits to have 2 credits
            const result = await client.query(`
                UPDATE users 
                SET credits_remaining = 2, 
                    total_credits_purchased = 2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE credits_remaining = 5 AND subscription_plan = 'free'
            `);
            
            console.log(`Updated ${result.rowCount} users from 5 to 2 credits`);
            
            // Add credit transaction records for the adjustment
            for (const user of usersWith5Credits.rows) {
                await client.query(`
                    INSERT INTO credit_transactions (user_id, transaction_type, credits_amount, description)
                    VALUES ($1, 'adjustment', -3, 'Credit adjustment: corrected from 5 to 2 free credits')
                `, [user.id]);
            }
            
            console.log('Added credit transaction records for adjustments');
        } else {
            console.log('No users found with incorrect credits');
        }
        
        // Verify the fix
        console.log('\nVerifying fix...');
        const verification = await client.query(`
            SELECT credits_remaining, subscription_plan, COUNT(*) as user_count
            FROM users 
            GROUP BY credits_remaining, subscription_plan
            ORDER BY credits_remaining, subscription_plan
        `);
        
        console.log('Updated credit distribution:');
        verification.rows.forEach(row => {
            console.log(`${row.credits_remaining} credits (${row.subscription_plan}): ${row.user_count} users`);
        });
        
        client.release();
        console.log('\nCredit fix completed successfully!');
        
    } catch (error) {
        console.error('Error fixing credits:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the fix
fixCredits().catch(console.error); 