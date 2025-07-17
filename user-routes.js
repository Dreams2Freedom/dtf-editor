const express = require('express');
const { authenticateToken, checkCredits } = require('./auth');
const { dbHelpers } = require('./database-postgres');
const { stripeHelpers } = require('./stripe');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const user = await dbHelpers.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get total images generated
        const images = await dbHelpers.getUserImages(req.user.id);
        user.total_images_generated = images.length;

        // Remove sensitive data
        delete user.password_hash;
        
        res.json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const { first_name, last_name, company } = req.body;
        
        const updates = {};
        if (first_name !== undefined) updates.first_name = first_name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (company !== undefined) updates.company = company;

        await dbHelpers.updateUser(req.user.id, updates);
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.put('/password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        const { authHelpers } = require('./auth');
        await authHelpers.updatePassword(req.user.id, current_password, new_password);
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: error.message || 'Failed to update password' });
    }
});

// Get user images
router.get('/images', async (req, res) => {
    try {
        const images = await dbHelpers.getUserImages(req.user.id);
        res.json({ images });
    } catch (error) {
        console.error('Error fetching user images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// Download user image
router.get('/images/:imageId/download', async (req, res) => {
    try {
        // This would need to be implemented to serve the actual file
        // For now, we'll just return success
        res.json({ message: 'Image download endpoint' });
    } catch (error) {
        console.error('Error downloading image:', error);
        res.status(500).json({ error: 'Failed to download image' });
    }
});

// Get credit transactions
router.get('/credits/transactions', async (req, res) => {
    try {
        const transactions = await dbHelpers.getUserCreditTransactions(req.user.id);
        res.json({ transactions });
    } catch (error) {
        console.error('Error fetching credit transactions:', error);
        res.status(500).json({ error: 'Failed to fetch credit transactions' });
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

// Create subscription
router.post('/subscription', async (req, res) => {
    try {
        const { priceId } = req.body;
        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }

        const subscription = await stripeHelpers.createSubscription(req.user.id, priceId);
        res.json({ subscription });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// Cancel subscription
router.post('/subscription/cancel', async (req, res) => {
    try {
        await stripeHelpers.cancelSubscription(req.user.id);
        res.json({ message: 'Subscription canceled successfully' });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Reactivate subscription
router.post('/subscription/reactivate', async (req, res) => {
    try {
        await stripeHelpers.reactivateSubscription(req.user.id);
        res.json({ message: 'Subscription reactivated successfully' });
    } catch (error) {
        console.error('Error reactivating subscription:', error);
        res.status(500).json({ error: 'Failed to reactivate subscription' });
    }
});

// Change subscription plan
router.post('/subscription/change-plan', async (req, res) => {
    try {
        const { newPriceId } = req.body;
        if (!newPriceId) {
            return res.status(400).json({ error: 'New price ID is required' });
        }

        await stripeHelpers.changeSubscriptionPlan(req.user.id, newPriceId);
        res.json({ message: 'Subscription plan changed successfully' });
    } catch (error) {
        console.error('Error changing subscription plan:', error);
        res.status(500).json({ error: 'Failed to change subscription plan' });
    }
});

// Purchase credits
router.post('/credits/purchase', async (req, res) => {
    try {
        const { credits, description } = req.body;
        if (!credits || credits <= 0) {
            return res.status(400).json({ error: 'Valid credits amount is required' });
        }

        // This would integrate with Stripe Checkout or Payment Intents
        // For now, we'll just add credits directly
        await stripeHelpers.addCredits(req.user.id, credits, description || 'Credit purchase');
        
        res.json({ message: 'Credits purchased successfully' });
    } catch (error) {
        console.error('Error purchasing credits:', error);
        res.status(500).json({ error: 'Failed to purchase credits' });
    }
});

// Get usage statistics
router.get('/usage', async (req, res) => {
    try {
        const user = await dbHelpers.getUserById(req.user.id);
        const images = await dbHelpers.getUserImages(req.user.id);
        const transactions = await dbHelpers.getUserCreditTransactions(req.user.id);

        const usage = {
            credits_remaining: user.credits_remaining,
            credits_used: user.credits_used,
            total_credits_purchased: user.total_credits_purchased,
            total_images_generated: images.length,
            images_this_month: images.filter(img => {
                const imgDate = new Date(img.created_at);
                const now = new Date();
                return imgDate.getMonth() === now.getMonth() && imgDate.getFullYear() === now.getFullYear();
            }).length,
            subscription_status: user.subscription_status,
            subscription_plan: user.subscription_plan,
            subscription_end_date: user.subscription_end_date
        };

        res.json({ usage });
    } catch (error) {
        console.error('Error fetching usage statistics:', error);
        res.status(500).json({ error: 'Failed to fetch usage statistics' });
    }
});

module.exports = router;
