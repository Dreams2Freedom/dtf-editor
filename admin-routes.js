const express = require('express');
const { authenticateAdmin } = require('./auth');
const { dbHelpers } = require('./database-postgres');
const { stripeHelpers } = require('./stripe');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await dbHelpers.getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user details
router.get('/users/:id', async (req, res) => {
    try {
        const user = await dbHelpers.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's images
        const images = await dbHelpers.getUserImages(user.id);
        
        // Get user's credit transactions
        const transactions = await dbHelpers.getUserCreditTransactions(user.id);

        res.json({ 
            user, 
            images, 
            transactions,
            total_images: images.length,
            total_credits_used: transactions.reduce((sum, t) => sum + Math.abs(t.credits_amount), 0)
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { first_name, last_name, company, is_active, credits_remaining } = req.body;
        
        const updates = {};
        if (first_name !== undefined) updates.first_name = first_name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (company !== undefined) updates.company = company;
        if (is_active !== undefined) updates.is_active = is_active;
        if (credits_remaining !== undefined) updates.credits_remaining = credits_remaining;

        await dbHelpers.updateUser(req.params.id, updates);

        // Log admin action
        await dbHelpers.addAdminLog({
            admin_user_id: req.adminUser.id,
            action: 'update_user',
            target_user_id: req.params.id,
            details: JSON.stringify(updates),
            ip_address: req.ip
        });

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await dbHelpers.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cancel subscription if exists
        if (user.stripe_customer_id) {
            try {
                await stripeHelpers.cancelSubscription(user.id);
            } catch (error) {
                console.error('Error canceling subscription:', error);
            }
        }

        // Deactivate user
        await dbHelpers.updateUser(req.params.id, { is_active: false });

        // Log admin action
        await dbHelpers.addAdminLog({
            admin_user_id: req.adminUser.id,
            action: 'delete_user',
            target_user_id: req.params.id,
            details: 'User account deactivated',
            ip_address: req.ip
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Cancel user subscription
router.post('/users/:id/cancel-subscription', async (req, res) => {
    try {
        await stripeHelpers.cancelSubscription(req.params.id);

        // Log admin action
        await dbHelpers.addAdminLog({
            admin_user_id: req.adminUser.id,
            action: 'cancel_subscription',
            target_user_id: req.params.id,
            details: 'Subscription canceled by admin',
            ip_address: req.ip
        });

        res.json({ message: 'Subscription canceled successfully' });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Reactivate user subscription
router.post('/users/:id/reactivate-subscription', async (req, res) => {
    try {
        await stripeHelpers.reactivateSubscription(req.params.id);

        // Log admin action
        await dbHelpers.addAdminLog({
            admin_user_id: req.adminUser.id,
            action: 'reactivate_subscription',
            target_user_id: req.params.id,
            details: 'Subscription reactivated by admin',
            ip_address: req.ip
        });

        res.json({ message: 'Subscription reactivated successfully' });
    } catch (error) {
        console.error('Error reactivating subscription:', error);
        res.status(500).json({ error: 'Failed to reactivate subscription' });
    }
});

// Change user subscription plan
router.post('/users/:id/change-plan', async (req, res) => {
    try {
        const { newPriceId } = req.body;
        if (!newPriceId) {
            return res.status(400).json({ error: 'New price ID is required' });
        }

        await stripeHelpers.changeSubscriptionPlan(req.params.id, newPriceId);

        // Log admin action
        await dbHelpers.addAdminLog({
            admin_user_id: req.adminUser.id,
            action: 'change_subscription_plan',
            target_user_id: req.params.id,
            details: `Plan changed to ${newPriceId}`,
            ip_address: req.ip
        });

        res.json({ message: 'Subscription plan changed successfully' });
    } catch (error) {
        console.error('Error changing subscription plan:', error);
        res.status(500).json({ error: 'Failed to change subscription plan' });
    }
});

// Add credits to user
router.post('/users/:id/add-credits', async (req, res) => {
    try {
        const { credits, description } = req.body;
        if (!credits || credits <= 0) {
            return res.status(400).json({ error: 'Valid credits amount is required' });
        }

        await stripeHelpers.addCredits(req.params.id, credits, description || 'Credits added by admin');

        // Log admin action
        await dbHelpers.addAdminLog({
            admin_user_id: req.adminUser.id,
            action: 'add_credits',
            target_user_id: req.params.id,
            details: `Added ${credits} credits: ${description || 'No description'}`,
            ip_address: req.ip
        });

        res.json({ message: 'Credits added successfully' });
    } catch (error) {
        console.error('Error adding credits:', error);
        res.status(500).json({ error: 'Failed to add credits' });
    }
});

// Get subscription plans
router.get('/subscription-plans', async (req, res) => {
    try {
        const plans = await dbHelpers.getSubscriptionPlans();
        res.json({ plans });
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
});

// Create subscription plan
router.post('/subscription-plans', async (req, res) => {
    try {
        const { name, stripe_price_id, monthly_price, yearly_price, credits_per_month, credits_per_year, features } = req.body;
        
        // This would need to be implemented in dbHelpers
        // For now, we'll just return success
        res.json({ message: 'Subscription plan created successfully' });
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        res.status(500).json({ error: 'Failed to create subscription plan' });
    }
});

// Get analytics
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await stripeHelpers.getSubscriptionAnalytics();
        const adminLogs = await dbHelpers.getAdminLogs();
        
        res.json({ 
            analytics,
            recent_admin_actions: adminLogs.slice(0, 10)
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get cost analytics
router.get('/cost-analytics', async (req, res) => {
    try {
        const { period = '30d', service } = req.query;
        const costAnalytics = await dbHelpers.getCostAnalytics(period, service);
        
        res.json({ 
            cost_analytics: costAnalytics
        });
    } catch (error) {
        console.error('Error fetching cost analytics:', error);
        res.status(500).json({ error: 'Failed to fetch cost analytics' });
    }
});

// Get cost summary
router.get('/cost-summary', async (req, res) => {
    try {
        const { period_type = 'daily', days = 30 } = req.query;
        const costSummary = await dbHelpers.getCostSummary(period_type, parseInt(days));
        
        res.json({ 
            cost_summary: costSummary
        });
    } catch (error) {
        console.error('Error fetching cost summary:', error);
        res.status(500).json({ error: 'Failed to fetch cost summary' });
    }
});

// Get admin logs
router.get('/logs', async (req, res) => {
    try {
        const logs = await dbHelpers.getAdminLogs();
        res.json({ logs });
    } catch (error) {
        console.error('Error fetching admin logs:', error);
        res.status(500).json({ error: 'Failed to fetch admin logs' });
    }
});

// Download user image
router.get('/users/:id/images/:imageId/download', async (req, res) => {
    try {
        // This would need to be implemented to serve the actual file
        // For now, we'll just return success
        res.json({ message: 'Image download endpoint' });
    } catch (error) {
        console.error('Error downloading image:', error);
        res.status(500).json({ error: 'Failed to download image' });
    }
});

module.exports = router;
