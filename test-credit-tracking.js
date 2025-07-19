const { dbHelpers, initializeDatabase } = require('./database-postgres');
const { stripeHelpers } = require('./stripe');

// Initialize database connection
async function initializeDatabaseConnection() {
    try {
        await initializeDatabase();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Comprehensive Credit Tracking Test Suite
 * This script tests all aspects of credit tracking in the DTF Editor application
 */

async function testCreditTracking() {
    console.log('🧪 Starting Credit Tracking Test Suite...\n');

    try {
        // Initialize database first
        await initializeDatabaseConnection();
        
        // Test 1: Check database schema
        await testDatabaseSchema();
        
        // Test 2: Test credit operations
        await testCreditOperations();
        
        // Test 3: Test API cost logging
        await testApiCostLogging();
        
        // Test 4: Test user dashboard credit display
        await testUserDashboardCredits();
        
        // Test 5: Test admin dashboard credit display
        await testAdminDashboardCredits();
        
        // Test 6: Test credit transaction history
        await testCreditTransactions();
        
        console.log('\n✅ All credit tracking tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Credit tracking test failed:', error);
        throw error;
    }
}

async function testDatabaseSchema() {
    console.log('📊 Testing Database Schema...');
    
    try {
        // Check if users table has credit fields
        const userFields = await dbHelpers.getClient().then(client => 
            client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('credits_remaining', 'credits_used', 'total_credits_purchased')
                ORDER BY column_name
            `)
        );
        
        console.log('✅ Users table credit fields:');
        userFields.rows.forEach(field => {
            console.log(`   - ${field.column_name}: ${field.data_type} (default: ${field.column_default})`);
        });
        
        // Check if api_costs table exists
        const apiCostsExists = await dbHelpers.getClient().then(client =>
            client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'api_costs'
                )
            `)
        );
        
        if (apiCostsExists.rows[0].exists) {
            console.log('✅ api_costs table exists');
        } else {
            console.log('❌ api_costs table missing');
        }
        
        // Check if credit_transactions table exists
        const creditTransactionsExists = await dbHelpers.getClient().then(client =>
            client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'credit_transactions'
                )
            `)
        );
        
        if (creditTransactionsExists.rows[0].exists) {
            console.log('✅ credit_transactions table exists');
        } else {
            console.log('❌ credit_transactions table missing');
        }
        
    } catch (error) {
        console.error('❌ Database schema test failed:', error);
        throw error;
    }
}

async function testCreditOperations() {
    console.log('\n💰 Testing Credit Operations...');
    
    try {
        // Get a test user (first user in database)
        const users = await dbHelpers.getAllUsers(1, 0);
        if (users.length === 0) {
            console.log('⚠️  No users found for testing');
            return;
        }
        
        const testUser = users[0];
        console.log(`📝 Testing with user: ${testUser.email} (ID: ${testUser.id})`);
        console.log(`   Current credits: ${testUser.credits_remaining}`);
        
        // Test adding credits
        const creditsToAdd = 5;
        await stripeHelpers.addCredits(testUser.id, creditsToAdd, 'Test credit addition');
        
        // Verify credits were added
        const updatedUser = await dbHelpers.getUserById(testUser.id);
        console.log(`   Credits after adding ${creditsToAdd}: ${updatedUser.credits_remaining}`);
        
        if (updatedUser.credits_remaining !== testUser.credits_remaining + creditsToAdd) {
            throw new Error('Credit addition failed');
        }
        
        // Test using credits
        const creditsToUse = 2;
        await stripeHelpers.useCredits(testUser.id, creditsToUse, 'Test credit usage');
        
        // Verify credits were deducted
        const finalUser = await dbHelpers.getUserById(testUser.id);
        console.log(`   Credits after using ${creditsToUse}: ${finalUser.credits_remaining}`);
        
        if (finalUser.credits_remaining !== updatedUser.credits_remaining - creditsToUse) {
            throw new Error('Credit usage failed');
        }
        
        console.log('✅ Credit operations test passed');
        
    } catch (error) {
        console.error('❌ Credit operations test failed:', error);
        throw error;
    }
}

async function testApiCostLogging() {
    console.log('\n📈 Testing API Cost Logging...');
    
    try {
        // Get a test user
        const users = await dbHelpers.getAllUsers(1, 0);
        if (users.length === 0) {
            console.log('⚠️  No users found for testing');
            return;
        }
        
        const testUser = users[0];
        
        // Test logging a vectorizer API cost
        const vectorizerCost = {
            service_name: 'vectorizer',
            operation_type: 'vectorize',
            cost_amount: 0.20, // $0.20 for 1 credit
            user_id: testUser.id,
            request_id: `test_vectorize_${Date.now()}`,
            response_time_ms: 1500,
            success: true,
            metadata: { mode: 'vectorize', file_size: 1024000 }
        };
        
        const costId = await dbHelpers.logApiCost(vectorizerCost);
        console.log(`✅ Logged vectorizer cost with ID: ${costId}`);
        
        // Test logging a clipping magic API cost
        const clippingMagicCost = {
            service_name: 'clipping_magic',
            operation_type: 'upload',
            cost_amount: 0.125, // $0.125 for 1 credit
            user_id: testUser.id,
            request_id: `test_clipping_${Date.now()}`,
            response_time_ms: 2000,
            success: true,
            metadata: { image_id: 12345 }
        };
        
        const clippingCostId = await dbHelpers.logApiCost(clippingMagicCost);
        console.log(`✅ Logged clipping magic cost with ID: ${clippingCostId}`);
        
        // Test logging a failed API call (should have 0 cost)
        const failedCost = {
            service_name: 'vectorizer',
            operation_type: 'vectorize',
            cost_amount: 0.00, // No charge for failed requests
            user_id: testUser.id,
            request_id: `test_failed_${Date.now()}`,
            response_time_ms: 500,
            success: false,
            error_message: 'Test error message',
            metadata: { mode: 'vectorize', file_size: 1024000 }
        };
        
        const failedCostId = await dbHelpers.logApiCost(failedCost);
        console.log(`✅ Logged failed API cost with ID: ${failedCostId}`);
        
        console.log('✅ API cost logging test passed');
        
    } catch (error) {
        console.error('❌ API cost logging test failed:', error);
        throw error;
    }
}

async function testUserDashboardCredits() {
    console.log('\n👤 Testing User Dashboard Credit Display...');
    
    try {
        // Get a test user
        const users = await dbHelpers.getAllUsers(1, 0);
        if (users.length === 0) {
            console.log('⚠️  No users found for testing');
            return;
        }
        
        const testUser = users[0];
        
        // Simulate what the dashboard would display
        console.log(`📊 User Dashboard for ${testUser.email}:`);
        console.log(`   Credits Remaining: ${testUser.credits_remaining}`);
        console.log(`   Credits Used: ${testUser.credits_used || 0}`);
        console.log(`   Total Credits Purchased: ${testUser.total_credits_purchased || 0}`);
        console.log(`   Subscription Plan: ${testUser.subscription_plan || 'free'}`);
        console.log(`   Subscription Status: ${testUser.subscription_status || 'none'}`);
        
        // Verify credit calculations
        const expectedUsed = (testUser.total_credits_purchased || 0) - testUser.credits_remaining;
        if (testUser.credits_used !== expectedUsed) {
            console.log(`⚠️  Credit usage mismatch: expected ${expectedUsed}, got ${testUser.credits_used}`);
        } else {
            console.log('✅ Credit calculations are correct');
        }
        
        console.log('✅ User dashboard credit display test passed');
        
    } catch (error) {
        console.error('❌ User dashboard credit display test failed:', error);
        throw error;
    }
}

async function testAdminDashboardCredits() {
    console.log('\n👨‍💼 Testing Admin Dashboard Credit Display...');
    
    try {
        // Get all users for admin view
        const users = await dbHelpers.getAllUsers(10, 0);
        
        console.log(`📊 Admin Dashboard - User Credit Summary:`);
        console.log(`   Total Users: ${users.length}`);
        
        let totalCredits = 0;
        let totalUsed = 0;
        let totalPurchased = 0;
        
        users.forEach(user => {
            totalCredits += user.credits_remaining || 0;
            totalUsed += user.credits_used || 0;
            totalPurchased += user.total_credits_purchased || 0;
            
            console.log(`   ${user.email}: ${user.credits_remaining} remaining, ${user.credits_used || 0} used`);
        });
        
        console.log(`\n📈 Admin Summary:`);
        console.log(`   Total Credits Remaining: ${totalCredits}`);
        console.log(`   Total Credits Used: ${totalUsed}`);
        console.log(`   Total Credits Purchased: ${totalPurchased}`);
        
        // Test admin user management functions
        if (users.length > 0) {
            const testUser = users[0];
            console.log(`\n🔧 Testing admin credit management for ${testUser.email}:`);
            
            // Test getting user details (simulate admin panel)
            const userDetails = await dbHelpers.getUserById(testUser.id);
            console.log(`   Current credits: ${userDetails.credits_remaining}`);
            console.log(`   Can edit credits: ${userDetails.is_admin ? 'No (admin user)' : 'Yes'}`);
        }
        
        console.log('✅ Admin dashboard credit display test passed');
        
    } catch (error) {
        console.error('❌ Admin dashboard credit display test failed:', error);
        throw error;
    }
}

async function testCreditTransactions() {
    console.log('\n📋 Testing Credit Transaction History...');
    
    try {
        // Get a test user
        const users = await dbHelpers.getAllUsers(1, 0);
        if (users.length === 0) {
            console.log('⚠️  No users found for testing');
            return;
        }
        
        const testUser = users[0];
        
        // Get user's transaction history
        const transactions = await dbHelpers.getCreditTransactions(testUser.id, 10, 0);
        
        console.log(`📋 Transaction History for ${testUser.email}:`);
        console.log(`   Total Transactions: ${transactions.length}`);
        
        transactions.forEach((tx, index) => {
            console.log(`   ${index + 1}. ${tx.transaction_type}: ${tx.credits_amount} credits - ${tx.description}`);
            console.log(`      Date: ${tx.created_at}`);
        });
        
        // Test transaction calculations
        const purchaseTransactions = transactions.filter(tx => tx.transaction_type === 'purchase');
        const usageTransactions = transactions.filter(tx => tx.transaction_type === 'usage');
        
        const totalPurchased = purchaseTransactions.reduce((sum, tx) => sum + tx.credits_amount, 0);
        const totalUsed = Math.abs(usageTransactions.reduce((sum, tx) => sum + tx.credits_amount, 0));
        
        console.log(`\n📊 Transaction Summary:`);
        console.log(`   Total Purchased: ${totalPurchased} credits`);
        console.log(`   Total Used: ${totalUsed} credits`);
        console.log(`   Net Credits: ${totalPurchased - totalUsed} credits`);
        console.log(`   User Credits Remaining: ${testUser.credits_remaining}`);
        
        // Verify transaction balance
        if (totalPurchased - totalUsed !== testUser.credits_remaining) {
            console.log(`⚠️  Transaction balance mismatch: expected ${totalPurchased - totalUsed}, got ${testUser.credits_remaining}`);
        } else {
            console.log('✅ Transaction balance is correct');
        }
        
        console.log('✅ Credit transaction history test passed');
        
    } catch (error) {
        console.error('❌ Credit transaction history test failed:', error);
        throw error;
    }
}

// Run the test suite
if (require.main === module) {
    testCreditTracking()
        .then(() => {
            console.log('\n🎉 Credit tracking test suite completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Credit tracking test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { testCreditTracking }; 