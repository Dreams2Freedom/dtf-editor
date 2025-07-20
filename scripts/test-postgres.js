const { dbHelpers, initializeDatabase } = require('../database-postgres');
require('dotenv').config();

// Simple assertion function
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

// Assertion helpers
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(`Assertion failed: ${message}. Value is null or undefined`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function testPostgreSQL() {
    console.log('Testing PostgreSQL connection...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    let testUserId = null;
    let testImageId = null;
    
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
        testUserId = userId;
        
        // Assertions for user creation
        assertNotNull(userId, 'User ID should not be null');
        assertTrue(userId > 0, 'User ID should be a positive integer');
        console.log('✅ User created successfully, ID:', userId);
        
        // Test user retrieval
        const user = await dbHelpers.getUserByEmail('test@example.com');
        
        // Assertions for user retrieval
        assertNotNull(user, 'User should not be null');
        assertEqual(user.email, 'test@example.com', 'User email should match');
        assertEqual(user.first_name, 'Test', 'User first name should match');
        assertEqual(user.last_name, 'User', 'User last name should match');
        assertEqual(user.company, 'Test Company', 'User company should match');
        assertEqual(user.id, userId, 'User ID should match');
        console.log('✅ User retrieved successfully:', user.email);
        
        // Test user retrieval by ID
        const userById = await dbHelpers.getUserById(userId);
        assertNotNull(userById, 'User by ID should not be null');
        assertEqual(userById.email, 'test@example.com', 'User by ID email should match');
        console.log('✅ User retrieved by ID successfully');
        
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
        testImageId = imageId;
        
        // Assertions for image saving
        assertNotNull(imageId, 'Image ID should not be null');
        assertTrue(imageId > 0, 'Image ID should be a positive integer');
        console.log('✅ Image saved successfully, ID:', imageId);
        
        // Test image retrieval
        const image = await dbHelpers.getImageById(imageId);
        assertNotNull(image, 'Image should not be null');
        assertEqual(image.original_filename, 'test.jpg', 'Original filename should match');
        assertEqual(image.processed_filename, 'test_vectorized.svg', 'Processed filename should match');
        assertEqual(image.file_size, 1024, 'File size should match');
        assertEqual(image.image_type, 'vectorization', 'Image type should match');
        assertEqual(image.tool_used, 'vectorizer', 'Tool used should match');
        assertEqual(image.credits_used, 1, 'Credits used should match');
        assertEqual(image.processing_time_ms, 1500, 'Processing time should match');
        console.log('✅ Image retrieved successfully');
        
        // Test credit transaction
        await dbHelpers.addCreditTransaction(userId, 'purchase', 10, 'Test credit purchase');
        console.log('✅ Credit transaction added successfully');
        
        // Test credit transactions retrieval
        const transactions = await dbHelpers.getCreditTransactions(userId);
        assertNotNull(transactions, 'Credit transactions should not be null');
        assertTrue(transactions.length > 0, 'Should have at least one credit transaction');
        
        const lastTransaction = transactions[0]; // Most recent transaction
        assertEqual(lastTransaction.user_id, userId, 'Transaction user ID should match');
        assertEqual(lastTransaction.type, 'purchase', 'Transaction type should match');
        assertEqual(lastTransaction.amount, 10, 'Transaction amount should match');
        assertEqual(lastTransaction.description, 'Test credit purchase', 'Transaction description should match');
        console.log('✅ Credit transactions retrieved successfully');
        
        // Test admin operations
        const users = await dbHelpers.getAllUsers(5);
        assertNotNull(users, 'Users list should not be null');
        assertTrue(users.length > 0, 'Should have at least one user');
        assertTrue(users.some(u => u.email === 'test@example.com'), 'Test user should be in users list');
        console.log('✅ Retrieved users:', users.length);
        
        const stats = await dbHelpers.getStats();
        assertNotNull(stats, 'Stats should not be null');
        assertTrue(typeof stats.total_users === 'number', 'Total users should be a number');
        assertTrue(typeof stats.total_images === 'number', 'Total images should be a number');
        assertTrue(typeof stats.total_credits_purchased === 'number', 'Total credits purchased should be a number');
        console.log('✅ Retrieved stats:', stats);
        
        // Test user update
        await dbHelpers.updateUser(userId, { 
            first_name: 'Updated',
            last_name: 'Name',
            company: 'Updated Company'
        });
        
        const updatedUser = await dbHelpers.getUserByEmail('test@example.com');
        assertEqual(updatedUser.first_name, 'Updated', 'Updated first name should match');
        assertEqual(updatedUser.last_name, 'Name', 'Updated last name should match');
        assertEqual(updatedUser.company, 'Updated Company', 'Updated company should match');
        console.log('✅ User updated successfully');
        
        // Clean up test data
        await dbHelpers.updateUser(userId, { is_active: false });
        const deactivatedUser = await dbHelpers.getUserById(userId);
        assertEqual(deactivatedUser.is_active, false, 'User should be deactivated');
        console.log('✅ Test user deactivated');
        
        console.log('\n🎉 All PostgreSQL tests passed with assertions!');
        
    } catch (error) {
        console.error('❌ PostgreSQL test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Clean up test data if test failed
        if (testUserId) {
            try {
                await dbHelpers.updateUser(testUserId, { is_active: false });
            } catch (cleanupError) {
                console.warn('Warning: Could not clean up test user:', cleanupError.message);
            }
        }
        
        // Close database connection
        try {
            await dbHelpers.close();
        } catch (closeError) {
            console.warn('Warning: Could not close database connection:', closeError.message);
        }
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