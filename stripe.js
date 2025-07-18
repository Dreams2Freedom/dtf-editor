const { dbHelpers } = require('./database-postgres');

// Lazy initialization of Stripe to ensure environment variables are loaded
let stripe = null;
function getStripe() {
    if (!stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not set');
        }
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

const stripeHelpers = {
    // Create Stripe customer
    createCustomer: async (user) => {
        try {
            const customer = await getStripe().customers.create({
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                metadata: {
                    user_id: user.id
                }
            });

            // Update user with Stripe customer ID
            await dbHelpers.updateUser(user.id, { stripe_customer_id: customer.id });

            return customer;
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
            throw error;
        }
    },

    // Create subscription
    createSubscription: async (userId, priceId) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create customer if doesn't exist
            let customerId = user.stripe_customer_id;
            if (!customerId) {
                const customer = await stripeHelpers.createCustomer(user);
                customerId = customer.id;
            }

            // Create subscription
            const subscription = await getStripe().subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
            });

            // Get plan details
            const plan = await dbHelpers.getSubscriptionPlans().then(plans => 
                plans.find(p => p.stripe_price_id === priceId)
            );

            // Save subscription to database
            await dbHelpers.createSubscription({
                user_id: userId,
                stripe_subscription_id: subscription.id,
                plan_id: plan.id,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000),
                current_period_end: new Date(subscription.current_period_end * 1000)
            });

            // Update user subscription status
            await dbHelpers.updateUser(userId, {
                subscription_status: subscription.status,
                subscription_plan: plan.name.toLowerCase(),
                subscription_end_date: new Date(subscription.current_period_end * 1000)
            });

            return subscription;
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    },

    // Cancel subscription
    cancelSubscription: async (userId) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user || !user.stripe_customer_id) {
                throw new Error('User or subscription not found');
            }

            // Get user's active subscription
            const subscriptions = await getStripe().subscriptions.list({
                customer: user.stripe_customer_id,
                status: 'active'
            });

            if (subscriptions.data.length === 0) {
                throw new Error('No active subscription found');
            }

            const subscription = subscriptions.data[0];

            // Cancel at period end
            const canceledSubscription = await getStripe().subscriptions.update(subscription.id, {
                cancel_at_period_end: true
            });

            // Update database
            await dbHelpers.updateUser(userId, {
                subscription_status: 'canceled',
                subscription_end_date: new Date(canceledSubscription.current_period_end * 1000)
            });

            return canceledSubscription;
        } catch (error) {
            console.error('Error canceling subscription:', error);
            throw error;
        }
    },

    // Reactivate subscription
    reactivateSubscription: async (userId) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user || !user.stripe_customer_id) {
                throw new Error('User or subscription not found');
            }

            // Get user's canceled subscription
            const subscriptions = await getStripe().subscriptions.list({
                customer: user.stripe_customer_id,
                status: 'canceled'
            });

            if (subscriptions.data.length === 0) {
                throw new Error('No canceled subscription found');
            }

            const subscription = subscriptions.data[0];

            // Reactivate subscription
            const reactivatedSubscription = await getStripe().subscriptions.update(subscription.id, {
                cancel_at_period_end: false
            });

            // Update database
            await dbHelpers.updateUser(userId, {
                subscription_status: 'active',
                subscription_end_date: new Date(reactivatedSubscription.current_period_end * 1000)
            });

            return reactivatedSubscription;
        } catch (error) {
            console.error('Error reactivating subscription:', error);
            throw error;
        }
    },

    // Change subscription plan
    changeSubscriptionPlan: async (userId, newPriceId) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user || !user.stripe_customer_id) {
                throw new Error('User or subscription not found');
            }

            // Get user's active subscription
            const subscriptions = await getStripe().subscriptions.list({
                customer: user.stripe_customer_id,
                status: 'active'
            });

            if (subscriptions.data.length === 0) {
                throw new Error('No active subscription found');
            }

            const subscription = subscriptions.data[0];

            // Update subscription
            const updatedSubscription = await getStripe().subscriptions.update(subscription.id, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                }],
                proration_behavior: 'create_prorations',
            });

            // Get new plan details
            const plan = await dbHelpers.getSubscriptionPlans().then(plans => 
                plans.find(p => p.stripe_price_id === newPriceId)
            );

            // Update database
            await dbHelpers.updateUser(userId, {
                subscription_plan: plan.name.toLowerCase(),
                subscription_end_date: new Date(updatedSubscription.current_period_end * 1000)
            });

            return updatedSubscription;
        } catch (error) {
            console.error('Error changing subscription plan:', error);
            throw error;
        }
    },

    // Add credits to user
    addCredits: async (userId, credits, description, paymentIntentId = null) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Add credit transaction first
            await dbHelpers.addCreditTransaction(userId, 'purchase', credits, description, paymentIntentId);

            // Use atomic database operation to update credits
            // This prevents race conditions by using the database to calculate the new value
            await dbHelpers.updateUserCredits(userId, credits);

            // Update total credits purchased separately
            await dbHelpers.updateUser(userId, {
                total_credits_purchased: (user.total_credits_purchased || 0) + credits
            });

            return true;
        } catch (error) {
            console.error('Error adding credits:', error);
            throw error;
        }
    },

    // Use credits
    useCredits: async (userId, credits, description) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.credits_remaining < credits) {
                throw new Error('Insufficient credits');
            }

            // Add credit transaction first
            await dbHelpers.addCreditTransaction(userId, 'usage', -credits, description);

            // Use atomic database operation to update credits
            // This prevents race conditions by using the database to calculate the new value
            await dbHelpers.updateUserCredits(userId, -credits);

            return true;
        } catch (error) {
            console.error('Error using credits:', error);
            throw error;
        }
    },

    // Check if user has enough credits (without consuming them)
    checkCredits: async (userId, requiredCredits) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return {
                hasEnough: user.credits_remaining >= requiredCredits,
                credits: user.credits_remaining,
                required: requiredCredits
            };
        } catch (error) {
            console.error('Error checking credits:', error);
            throw error;
        }
    },

    // Get subscription analytics
    getSubscriptionAnalytics: async () => {
        try {
            const stats = await dbHelpers.getRevenueStats();
            
            // Get monthly recurring revenue
            const activeSubscriptions = await getStripe().subscriptions.list({
                status: 'active',
                limit: 100
            });

            let mrr = 0;
            activeSubscriptions.data.forEach(sub => {
                mrr += sub.items.data[0].price.unit_amount / 100; // Convert from cents
            });

            return {
                ...stats,
                monthly_recurring_revenue: mrr,
                total_subscriptions: activeSubscriptions.data.length
            };
        } catch (error) {
            console.error('Error getting subscription analytics:', error);
            throw error;
        }
    }
};

module.exports = { stripeHelpers };
