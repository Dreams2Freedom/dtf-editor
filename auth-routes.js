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

        // Enhanced email validation
        const normalizedEmail = email.trim().toLowerCase();
        
        // Check if email is empty
        if (!normalizedEmail) {
            return res.status(400).json({ error: 'Email address is required' });
        }
        
        // Enhanced email regex pattern
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Check for common invalid patterns
        const invalidPatterns = [
            /^[^@]*@[^@]*$/, // Must have exactly one @
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Basic format check
            /^[^@]+@[^@]+\.[^@]+$/, // Must have domain and TLD
            /^[^@]+@[^@]+\.[a-zA-Z]{2,}$/ // TLD must be at least 2 characters
        ];
        
        for (const pattern of invalidPatterns) {
            if (!pattern.test(normalizedEmail)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
        }
        
        // Check for common disposable email domains
        const disposableDomains = [
            'tempmail.org', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
            'yopmail.com', 'temp-mail.org', 'sharklasers.com', 'getairmail.com'
        ];
        
        const domain = normalizedEmail.split('@')[1];
        if (disposableDomains.includes(domain)) {
            return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long' 
            });
        }

        const result = await authHelpers.registerUser({
            email: normalizedEmail, // Use normalized email
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
            res.status(409).json({ 
                error: 'An account with this email address already exists. Please try logging in instead.',
                code: 'USER_EXISTS'
            });
        } else {
            res.status(500).json({ error: 'Registration failed. Please try again.' });
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

// Check if email exists (for registration flow)
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        
        // Check if user exists
        const existingUser = await dbHelpers.getUserByEmail(normalizedEmail);
        
        if (existingUser) {
            return res.status(200).json({ 
                exists: true,
                message: 'An account with this email already exists',
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    first_name: existingUser.first_name,
                    last_name: existingUser.last_name,
                    created_at: existingUser.created_at
                }
            });
        } else {
            return res.status(200).json({ 
                exists: false,
                message: 'Email is available for registration'
            });
        }
    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ error: 'Failed to check email availability' });
    }
});

// Enhanced forgot password
router.post('/forgot-password-enhanced', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        
        // Check if user exists
        const existingUser = await dbHelpers.getUserByEmail(normalizedEmail);
        
        if (!existingUser) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({ 
                message: 'If an account with this email exists, a password reset link has been sent.',
                sent: true
            });
        }

        // Generate a simple reset token (in production, use crypto.randomBytes)
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Store reset token in database (you'll need to add this table)
        // For now, we'll simulate it
        console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
        
        // TODO: Send email with reset link
        // For now, we'll return the token (in production, send via email)
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        
        res.json({ 
            message: 'Password reset link sent to your email',
            sent: true,
            resetUrl: resetUrl // Remove this in production
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

module.exports = router;
