const User = require("../models/user");
const bcrypt = require("bcryptjs");
const Session = require("../models/session");
const { verifyLocation } = require("../utils/geofencing");
const { validationResult } = require("express-validator");
const { 
    logDbOperation, 
    logDbError, 
    verifyConnection, 
    verifyCollection 
} = require("../utils/dbLogger");

// Utility function to ensure we don't send multiple responses
const sendResponse = (res, options) => {
    if (res.headersSent) return false;
    
    const { statusCode = 200, success = true, message, data = null, redirect = null } = options;
    
    if (redirect) {
        return res.redirect(redirect);
    }
    
    return res.status(statusCode).json({
        success,
        message,
        data
    });
};

// Utility function to handle async route errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

exports.getLogin = asyncHandler(async (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect(req.session.isAdmin ? '/admin/dashboard' : '/student/dashboard');
    }
    
    res.render("auth/login", {
        pageTitle: "Login",
        path: '/auth/login',
        errorMessage: req.flash('error')[0],
        successMessage: req.flash('success')[0],
        csrfToken: req.csrfToken()
    });
});

exports.getRegister = asyncHandler(async (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect(req.session.isAdmin ? '/admin/dashboard' : '/student/dashboard');
    }

    res.render("auth/register", {
        pageTitle: "Register",
        path: '/auth/register',
        errorMessage: req.flash('error')[0],
        successMessage: req.flash('success')[0],
        oldInput: req.flash('oldInput')[0] || {},
        validationErrors: req.flash('validationErrors')[0] || [],
        userType: req.query.type || null
    });
});

exports.postRegister = asyncHandler(async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            req.flash('oldInput', req.body);
            req.flash('validationErrors', errors.array());
            return res.redirect(`/auth/register?type=${req.body.userType}`);
        }

        const { name, email, password, userType, rollNo } = req.body;
        
        // Validate user type
        if (!userType || !['student', 'admin'].includes(userType)) {
            req.flash('error', 'Invalid user type');
            req.flash('oldInput', req.body);
            return res.redirect('/auth/register');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                userType === 'student' ? { rollNo: rollNo } : null
            ].filter(Boolean)
        });

        if (existingUser) {
            const errorMessage = existingUser.email === email.toLowerCase() 
                ? 'Email already exists' 
                : 'Roll number already exists';
            req.flash('error', errorMessage);
            req.flash('oldInput', req.body);
            return res.redirect(`/auth/register?type=${userType}`);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: userType,
            rollNo: userType === 'student' ? rollNo.trim() : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Save user to database
        await user.save();

        // Log successful registration
        await logDbOperation('User Registration', `User ${email} registered successfully`);

        req.flash('success', 'Registration successful! Please login.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration error:', error);
        await logDbError('User Registration', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            req.flash('error', messages.join(', '));
        } else if (error.code === 11000) {
            // Handle duplicate key errors
            const field = Object.keys(error.keyPattern)[0];
            req.flash('error', `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
        } else {
            req.flash('error', 'An error occurred during registration. Please try again.');
        }
        
        req.flash('oldInput', req.body);
        return res.redirect(`/auth/register?type=${req.body.userType}`);
    }
});

exports.postLogin = asyncHandler(async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/auth/login');
        }

        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Set session data
        req.session.isLoggedIn = true;
        req.session.isAdmin = user.role === 'admin';
        req.session.user = {
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
            rollNo: user.rollNo
        };

        // Save session
        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) {
                    console.error('Session save error:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        // Log successful login
        await logDbOperation('User Login', `User ${email} logged in successfully`);

        // Redirect based on role
        const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
        res.redirect(redirectPath);
    } catch (error) {
        console.error('Login error:', error);
        await logDbError('User Login', error);
        req.flash('error', 'An error occurred during login. Please try again.');
        res.redirect('/auth/login');
    }
});

exports.postLogout = asyncHandler(async (req, res) => {
    await new Promise((resolve, reject) => {
        req.session.destroy(err => {
            if (err) reject(err);
            else resolve();
        });
    });
    res.redirect('/auth/login');
});
