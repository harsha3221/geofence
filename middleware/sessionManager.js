const Session = require('../models/session');
const crypto = require('crypto');

// Session duration in hours
const SESSION_DURATION = 24;

// Generate a random session token
const generateSessionToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Create a new session
const createSession = async (user, req) => {
    // Invalidate any existing active sessions for this user
    await Session.updateMany(
        { userId: user._id, isActive: true },
        { $set: { isActive: false } }
    );

    // Create new session
    const session = new Session({
        userId: user._id,
        token: generateSessionToken(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + SESSION_DURATION * 60 * 60 * 1000)
    });

    // If geolocation data is provided
    if (req.body.latitude && req.body.longitude) {
        session.location = {
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            accuracy: req.body.accuracy || null
        };
    }

    await session.save();
    return session;
};

// Middleware to validate session
const validateSession = async (req, res, next) => {
    try {
        const token = req.session.token;
        if (!token) {
            return next();
        }

        const session = await Session.findOne({ 
            token: token,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            // Clear invalid session
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Update last activity
        await session.updateActivity();

        // Attach session and user info to request
        req.currentSession = session;
        next();
    } catch (error) {
        console.error('Session validation error:', error);
        req.session.destroy();
        res.redirect('/auth/login');
    }
};

// Middleware to check for existing sessions
const checkExistingSession = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        const existingSession = await Session.getActiveSession(req.user._id);
        if (existingSession && existingSession.token !== req.session.token) {
            // Another active session exists
            req.flash('warning', 'You have been logged out from another device');
            await existingSession.invalidate();
        }
        next();
    } catch (error) {
        console.error('Session check error:', error);
        next(error);
    }
};

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
    if (!req.session.token) {
        req.flash('error', 'Please login to continue');
        return res.redirect('/auth/login');
    }

    const session = await Session.findOne({
        token: req.session.token,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });

    if (!session) {
        req.flash('error', 'Session expired. Please login again');
        return res.redirect('/auth/login');
    }

    next();
};

// Cleanup expired sessions periodically
setInterval(async () => {
    try {
        await Session.cleanupExpiredSessions();
    } catch (error) {
        console.error('Session cleanup error:', error);
    }
}, 60 * 60 * 1000); // Run every hour

module.exports = {
    createSession,
    validateSession,
    checkExistingSession,
    requireAuth
}; 