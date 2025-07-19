const { dbHelpers, initializeDatabase } = require('./database-postgres');

/**
 * Fix Credit Tracking Data
 * This script corrects the credit tracking data in the database
 */

async function fixCreditTracking() {
    console.log('🔧 Starting Credit Tracking Data Fix...\n');

    try {
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized');

        // Get all users
        const users = await dbHelpers.getAllUsers();
        console.log(`📊 Found ${users.length} users to process`);

        for (const user of users) {
            console.log(`\n👤 Processing user: ${user.email}`);
            
            // Get user's transaction history
            const transactions = await dbHelpers.getUserCreditTransactions(user.id);
            
            // Calculate correct values from transactions
            const purchaseTransactions = transactions.filter(tx => tx.transaction_type === 'purchase');
            const usageTransactions = transactions.filter(tx => tx.transaction_type === 'usage');
            
            const totalPurchased = purchaseTransactions.reduce((sum, tx) => sum + tx.credits_amount, 0);
            const totalUsed = Math.abs(usageTransactions.reduce((sum, tx) => sum + tx.credits_amount, 0));
            const correctCreditsRemaining = totalPurchased - totalUsed;
            
            console.log(`   Current DB values:`);
            console.log(`     credits_remaining: ${user.credits_remaining}`);
            console.log(`     credits_used: ${user.credits_used || 'null'}`);
            console.log(`     total_credits_purchased: ${user.total_credits_purchased || 'null'}`);
            
            console.log(`   Calculated from transactions:`);
            console.log(`     total_purchased: ${totalPurchased}`);
            console.log(`     total_used: ${totalUsed}`);
            console.log(`     credits_remaining: ${correctCreditsRemaining}`);
            
            // Update user with correct values
            const updates = {};
            let needsUpdate = false;
            
            if (user.credits_remaining !== correctCreditsRemaining) {
                updates.credits_remaining = correctCreditsRemaining;
                needsUpdate = true;
            }
            
            if ((user.credits_used || 0) !== totalUsed) {
                updates.credits_used = totalUsed;
                needsUpdate = true;
            }
            
            if ((user.total_credits_purchased || 0) !== totalPurchased) {
                updates.total_credits_purchased = totalPurchased;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await dbHelpers.updateUser(user.id, updates);
                console.log(`   ✅ Updated user with correct values`);
            } else {
                console.log(`   ✅ User data is already correct`);
            }
        }
        
        console.log('\n🎉 Credit tracking data fix completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Credit tracking data fix failed:', error);
        throw error;
    }
}

// Run the fix
if (require.main === module) {
    fixCreditTracking()
        .then(() => {
            console.log('\n✅ Credit tracking data fix completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Credit tracking data fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixCreditTracking }; 