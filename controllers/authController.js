const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { verifyLocation } = require("../utils/geofencing");

exports.getLogin = (req, res) => {
    res.render("auth/login", {
        pageTitle: "Login",
        path: '/auth/login',
        errorMessage: req.flash('error')[0],
        successMessage: req.flash('success')[0],
        csrfToken: req.csrfToken()
    });
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password, latitude, longitude, altitude, accuracy } = req.body;
        
        console.log("🔍 Login attempt for email:", email);

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log("❌ User not found");
            const error = "Invalid email or password";
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({ success: false, message: error });
            }
            req.flash('error', error);
            return res.redirect('/auth/login');
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log("❌ Invalid password");
            const error = "Invalid email or password";
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({ success: false, message: error });
            }
            req.flash('error', error);
            return res.redirect('/auth/login');
        }

        // Verify location if coordinates provided
        if (latitude && longitude) {
            const locationCheck = await verifyLocation(latitude, longitude, altitude, accuracy);
            console.log("📍 Location check result:", locationCheck);

            if (!locationCheck.isValid) {
                const error = locationCheck.message;
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: error,
                        locationDetails: locationCheck
                    });
                }
                req.flash('error', error);
                return res.redirect('/auth/login');
            }

            // Update user's location
            await User.findByIdAndUpdate(user._id, {
                lastLocation: {
                    coordinates: [longitude, latitude],
                    altitude: altitude || null,
                    accuracy: accuracy || null,
                    timestamp: new Date()
                }
            });
        }

        // Set session
        req.session.isLoggedIn = true;
        req.session.isAdmin = user.role === 'admin';
        req.session.user = {
            _id: user._id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        return req.session.save((err) => {
            if (err) {
                console.error("❌ Session save error:", err);
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(500).json({
                        success: false,
                        message: "Session error occurred"
                    });
                }
                req.flash('error', 'Session error occurred');
                return res.redirect('/auth/login');
            }

            const redirectUrl = user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    redirectUrl
                });
            }
            
            return res.redirect(redirectUrl);
        });
    } catch (error) {
        console.error("❌ Login error:", error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: "An error occurred during login"
            });
        }
        req.flash('error', 'An error occurred during login');
        return res.redirect('/auth/login');
    }
};

exports.getRegister = (req, res) => {
    res.render("auth/register", {
        pageTitle: "Register",
        path: '/auth/register',
        errorMessage: req.flash('error')[0],
        successMessage: req.flash('success')[0],
        oldInput: req.flash('oldInput')[0] || {},
        validationErrors: req.flash('validationErrors')[0] || []
    });
};

exports.postRegister = async (req, res) => {
    try {
        const { name, email, password, role, rollNo } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = "Email already exists. Please choose another.";
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: error });
            }
            req.flash('error', error);
            req.flash('oldInput', req.body);
            return res.redirect('/auth/register');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            rollNo: role === 'student' ? rollNo : undefined
        });

        await user.save();

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(201).json({
                success: true,
                message: "Registration successful. Please login."
            });
        }

        req.flash('success', 'Registration successful. Please login.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error("❌ Registration error:", error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: "An error occurred during registration"
            });
        }
        req.flash('error', 'An error occurred during registration');
        req.flash('oldInput', req.body);
        res.redirect('/auth/register');
    }
};

exports.postLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("❌ Logout error:", err);
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: "Error during logout"
                });
            }
        }
        res.redirect('/auth/login');
    });
}; 