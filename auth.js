const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbHelpers } = require('./database');

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, async () => {
        try {
            const user = await dbHelpers.getUserById(req.user.id);
            if (!user || !user.is_admin) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            req.adminUser = user;
            next();
        } catch (error) {
            console.error('Admin authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    });
};

// Credit check middleware
const checkCredits = (requiredCredits = 1) => {
    return async (req, res, next) => {
        try {
            const user = await dbHelpers.getUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.credits_remaining < requiredCredits) {
                return res.status(402).json({ 
                    error: 'Insufficient credits',
                    credits_remaining: user.credits_remaining,
                    credits_required: requiredCredits
                });
            }

            req.userCredits = user.credits_remaining;
            next();
        } catch (error) {
            console.error('Credit check error:', error);
            res.status(500).json({ error: 'Credit check failed' });
        }
    };
};

// Authentication functions
const authHelpers = {
    // Hash password
    hashPassword: async (password) => {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    },

    // Compare password
    comparePassword: async (password, hash) => {
        return await bcrypt.compare(password, hash);
    },

    // Generate JWT token
    generateToken: (user) => {
        return jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                is_admin: user.is_admin 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
    },

    // Register new user
    registerUser: async (userData) => {
        try {
            const { email, password, first_name, last_name, company } = userData;
            
            // Check if user already exists
            const existingUser = await dbHelpers.getUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Hash password
            const password_hash = await authHelpers.hashPassword(password);

            // Create user
            const userId = await dbHelpers.createUser({
                email,
                password_hash,
                first_name,
                last_name,
                company
            });

            // Get created user
            const user = await dbHelpers.getUserById(userId);
            
            // Generate token
            const token = authHelpers.generateToken(user);

            return { user, token };
        } catch (error) {
            throw error;
        }
    },

    // Login user
    loginUser: async (email, password) => {
        try {
            // Get user by email
            const user = await dbHelpers.getUserByEmail(email);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check password
            const isValidPassword = await authHelpers.comparePassword(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // Generate token
            const token = authHelpers.generateToken(user);

            return { user, token };
        } catch (error) {
            throw error;
        }
    },

    // Update user password
    updatePassword: async (userId, currentPassword, newPassword) => {
        try {
            const user = await dbHelpers.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidPassword = await authHelpers.comparePassword(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await authHelpers.hashPassword(newPassword);

            // Update password
            await dbHelpers.updateUser(userId, { password_hash: newPasswordHash });

            return true;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = {
    authenticateToken,
    authenticateAdmin,
    checkCredits,
    authHelpers,
    JWT_SECRET
};
