const { dbHelpers, initializeDatabase } = require('../database-postgres');
require('dotenv').config();

async function testPostgreSQL() {
    console.log('Testing PostgreSQL connection...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    try {
        // Test database initialization
        await initializeDatabase();
        console.log('✅ Database initialized successfully');
        
        // Test user creation
        const testUser = {
            email: 'test@example.com',
            password_hash: '$2b$10$test',
            first_name: 'Test',
            last_name: 'User',
            company: 'Test Company'
        };
        
        const userId = await dbHelpers.createUser(testUser);
        console.log('✅ User created successfully, ID:', userId);
        
        // Test user retrieval
        const user = await dbHelpers.getUserByEmail('test@example.com');
        console.log('✅ User retrieved successfully:', user.email);
        
        // Test image saving
        const imageData = {
            user_id: userId,
            original_filename: 'test.jpg',
            processed_filename: 'test_vectorized.svg',
            file_size: 1024,
            image_type: 'vectorization',
            tool_used: 'vectorizer',
            credits_used: 1,
            processing_time_ms: 1500
        };
        
        const imageId = await dbHelpers.saveImage(imageData);
        console.log('✅ Image saved successfully, ID:', imageId);
        
        // Test credit transaction
        await dbHelpers.addCreditTransaction(userId, 'purchase', 10, 'Test credit purchase');
        console.log('✅ Credit transaction added successfully');
        
        // Test admin operations
        const users = await dbHelpers.getAllUsers(5);
        console.log('✅ Retrieved users:', users.length);
        
        const stats = await dbHelpers.getStats();
        console.log('✅ Retrieved stats:', stats);
        
        // Clean up test data
        await dbHelpers.updateUser(userId, { is_active: false });
        console.log('✅ Test user deactivated');
        
        console.log('\n🎉 All PostgreSQL tests passed!');
        
    } catch (error) {
        console.error('❌ PostgreSQL test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        await dbHelpers.close();
    }
}

// Run test if called directly
if (require.main === module) {
    testPostgreSQL()
        .then(() => {
            console.log('Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testPostgreSQL }; 