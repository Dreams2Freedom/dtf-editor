const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// SQLite database path
const sqlitePath = path.join(__dirname, '..', 'dtf_editor.db');

// PostgreSQL configuration
const pgConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dtf_editor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function migrateData() {
    console.log('Starting migration from SQLite to PostgreSQL...');
    
    // Connect to SQLite
    const sqliteDb = new sqlite3.Database(sqlitePath);
    const pgPool = new Pool(pgConfig);
    
    try {
        // Test PostgreSQL connection
        const client = await pgPool.connect();
        console.log('Connected to PostgreSQL');
        client.release();
        
        // Migrate users
        console.log('Migrating users...');
        await migrateUsers(sqliteDb, pgPool);
        
        // Migrate subscription plans
        console.log('Migrating subscription plans...');
        await migrateSubscriptionPlans(sqliteDb, pgPool);
        
        // Migrate subscriptions
        console.log('Migrating subscriptions...');
        await migrateSubscriptions(sqliteDb, pgPool);
        
        // Migrate images
        console.log('Migrating images...');
        await migrateImages(sqliteDb, pgPool);
        
        // Migrate credit transactions
        console.log('Migrating credit transactions...');
        await migrateCreditTransactions(sqliteDb, pgPool);
        
        // Migrate admin logs
        console.log('Migrating admin logs...');
        await migrateAdminLogs(sqliteDb, pgPool);
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        sqliteDb.close();
        await pgPool.end();
    }
}

async function migrateUsers(sqliteDb, pgPool) {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM users', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const client = await pgPool.connect();
            try {
                for (const user of rows) {
                    await client.query(`
                        INSERT INTO users (id, email, password_hash, first_name, last_name, company, 
                                         created_at, updated_at, is_active, is_admin, subscription_status, 
                                         subscription_plan, subscription_end_date, stripe_customer_id, 
                                         credits_remaining, credits_used, total_credits_purchased)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                        ON CONFLICT (id) DO NOTHING
                    `, [
                        user.id, user.email, user.password_hash, user.first_name, user.last_name, user.company,
                        user.created_at, user.updated_at, user.is_active, user.is_admin, user.subscription_status,
                        user.subscription_plan, user.subscription_end_date, user.stripe_customer_id,
                        user.credits_remaining, user.credits_used, user.total_credits_purchased
                    ]);
                }
                console.log(`Migrated ${rows.length} users`);
                resolve();
            } catch (error) {
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrateSubscriptionPlans(sqliteDb, pgPool) {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM subscription_plans', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const client = await pgPool.connect();
            try {
                for (const plan of rows) {
                    await client.query(`
                        INSERT INTO subscription_plans (id, name, stripe_price_id, monthly_price, yearly_price, 
                                                       credits_per_month, credits_per_year, features, is_active, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (id) DO NOTHING
                    `, [
                        plan.id, plan.name, plan.stripe_price_id, plan.monthly_price, plan.yearly_price,
                        plan.credits_per_month, plan.credits_per_year, plan.features, plan.is_active, plan.created_at
                    ]);
                }
                console.log(`Migrated ${rows.length} subscription plans`);
                resolve();
            } catch (error) {
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrateSubscriptions(sqliteDb, pgPool) {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM subscriptions', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const client = await pgPool.connect();
            try {
                for (const subscription of rows) {
                    await client.query(`
                        INSERT INTO subscriptions (id, user_id, stripe_subscription_id, plan_id, status, 
                                                 current_period_start, current_period_end, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (id) DO NOTHING
                    `, [
                        subscription.id, subscription.user_id, subscription.stripe_subscription_id,
                        subscription.plan_id, subscription.status, subscription.current_period_start,
                        subscription.current_period_end, subscription.created_at
                    ]);
                }
                console.log(`Migrated ${rows.length} subscriptions`);
                resolve();
            } catch (error) {
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrateImages(sqliteDb, pgPool) {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM images', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const client = await pgPool.connect();
            try {
                for (const image of rows) {
                    await client.query(`
                        INSERT INTO images (id, user_id, original_filename, processed_filename, file_size, 
                                          image_type, tool_used, credits_used, processing_time_ms, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (id) DO NOTHING
                    `, [
                        image.id, image.user_id, image.original_filename, image.processed_filename,
                        image.file_size, image.image_type, image.tool_used, image.credits_used,
                        image.processing_time_ms, image.created_at
                    ]);
                }
                console.log(`Migrated ${rows.length} images`);
                resolve();
            } catch (error) {
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrateCreditTransactions(sqliteDb, pgPool) {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM credit_transactions', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const client = await pgPool.connect();
            try {
                for (const transaction of rows) {
                    await client.query(`
                        INSERT INTO credit_transactions (id, user_id, transaction_type, credits_amount, 
                                                       description, stripe_payment_intent_id, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO NOTHING
                    `, [
                        transaction.id, transaction.user_id, transaction.transaction_type,
                        transaction.credits_amount, transaction.description, transaction.stripe_payment_intent_id,
                        transaction.created_at
                    ]);
                }
                console.log(`Migrated ${rows.length} credit transactions`);
                resolve();
            } catch (error) {
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrateAdminLogs(sqliteDb, pgPool) {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM admin_logs', async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const client = await pgPool.connect();
            try {
                for (const log of rows) {
                    await client.query(`
                        INSERT INTO admin_logs (id, admin_id, action, target_user_id, details, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (id) DO NOTHING
                    `, [
                        log.id, log.admin_id, log.action, log.target_user_id, log.details, log.created_at
                    ]);
                }
                console.log(`Migrated ${rows.length} admin logs`);
                resolve();
            } catch (error) {
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

// Run migration if called directly
if (require.main === module) {
    migrateData()
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateData }; 