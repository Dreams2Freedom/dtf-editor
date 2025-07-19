const { dbHelpers, initializeDatabase } = require('./database-postgres');

async function debugUserCredits() {
    try {
        await initializeDatabase();
        
        const users = await dbHelpers.getAllUsers();
        
        console.log('🔍 Current User Credit Status:\n');
        
        for (const user of users) {
            console.log(`👤 ${user.email} (ID: ${user.id}):`);
            console.log(`   Credits Remaining: ${user.credits_remaining}`);
            console.log(`   Credits Used: ${user.credits_used || 'null'}`);
            console.log(`   Total Credits Purchased: ${user.total_credits_purchased || 'null'}`);
            
            // Get recent transactions
            const transactions = await dbHelpers.getUserCreditTransactions(user.id);
            const recentTransactions = transactions.slice(0, 5);
            
            console.log(`   Recent Transactions:`);
            recentTransactions.forEach(tx => {
                console.log(`     ${tx.transaction_type}: ${tx.credits_amount} - ${tx.description}`);
            });
            
            console.log('');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

debugUserCredits(); 