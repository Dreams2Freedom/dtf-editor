const express = require('express');
const { authHelpers, authenticateToken } = require('./auth');
const { dbHelpers } = require('./database-postgres');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, company } = req.body;
        
        // Validate required fields
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ 
                error: 'Email, password, first name, and last name are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long' 
            });
        }

        const result = await authHelpers.registerUser({
            email,
            password,
            first_name,
            last_name,
            company
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: result.user.id,
                email: result.user.email,
                first_name: result.user.first_name,
                last_name: result.user.last_name,
                company: result.user.company,
                credits_remaining: result.user.credits_remaining,
                subscription_status: result.user.subscription_status,
                subscription_plan: result.user.subscription_plan
            },
            token: result.token
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message === 'User already exists') {
            res.status(409).json({ error: 'User already exists' });
        } else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        const result = await authHelpers.loginUser(email, password);

        res.json({
            message: 'Login successful',
            user: {
                id: result.user.id,
                email: result.user.email,
                first_name: result.user.first_name,
                last_name: result.user.last_name,
                company: result.user.company,
                is_admin: result.user.is_admin,
                credits_remaining: result.user.credits_remaining,
                subscription_status: result.user.subscription_status,
                subscription_plan: result.user.subscription_plan
            },
            token: result.token
        });
    } catch (error) {
        console.error('Login error:', error);
        if (error.message === 'Invalid credentials') {
            res.status(401).json({ error: 'Invalid email or password' });
        } else if (error.message === 'Account is deactivated') {
            res.status(403).json({ error: 'Account is deactivated' });
        } else {
            res.status(500).json({ error: 'Login failed' });
        }
    }
});

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        // Get full user data from database
        const user = await dbHelpers.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ 
            message: 'Token is valid',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                company: user.company,
                is_admin: user.is_admin,
                credits_remaining: user.credits_remaining,
                subscription_status: user.subscription_status,
                subscription_plan: user.subscription_plan
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// Forgot password (placeholder)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const user = await dbHelpers.getUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not
            return res.json({ message: 'If the email exists, a password reset link has been sent' });
        }

        // TODO: Implement password reset email functionality
        // For now, just return success
        res.json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Reset password (placeholder)
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        
        if (!token || !new_password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // TODO: Implement password reset functionality
        // For now, just return success
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
