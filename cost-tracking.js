const { dbHelpers } = require('./database-postgres');

/**
 * Log API cost to the database
 * @param {Object} costData - Cost data object
 * @returns {Promise<void>}
 */
async function logApiCost(costData) {
    // costData: { service_name, operation_type, cost_amount, user_id, request_id, response_time_ms, success, error_message, metadata }
    try {
        await dbHelpers.logApiCost(costData);
    } catch (error) {
        console.error('Failed to log API cost:', error);
    }
}

/**
 * Calculate Vectorizer.AI cost based on operation type
 * @param {string} operationType
 * @returns {number} Cost in USD
 */
function calculateVectorizerCost(operationType) {
    const creditCosts = {
        'test': 0.000,        // Free
        'test_preview': 0.000, // Free
        'preview': 0.200,     // 0.200 credits
        'vectorize': 1.000,   // 1.000 credits
        'upgrade_preview': 0.900, // 0.900 credits
        'download_format': 0.100, // 0.100 credits
        'storage_day': 0.010  // 0.010 credits per day
    };
    const credits = creditCosts[operationType] || 0;
    return credits * 0.20; // $0.20 per credit
}

/**
 * Calculate Clipping Magic cost based on operation type
 * @param {string} operationType
 * @returns {number} Cost in USD
 */
function calculateClippingMagicCost(operationType) {
    // Clipping Magic pricing: 1 Credit = 1 Image
    // Downloading a result multiple times counts only once
    // Duplicate uploads of the same image count separately
    const creditCosts = {
        'upload': 1.000,      // 1 credit per image upload
        'edit': 0.000,        // Free to re-edit (no additional cost)
        'download': 0.000     // Free to download multiple times (no additional cost)
    };
    const credits = creditCosts[operationType] || 0;
    return credits * 0.125; // $0.125 per credit
}

module.exports = {
    logApiCost,
    calculateVectorizerCost,
    calculateClippingMagicCost
}; 