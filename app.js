const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Environment Variables Status:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Loaded' : '❌ Missing');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('SERVER_URL:', process.env.SERVER_URL ? '✅ Loaded' : '❌ Missing');

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");

const errorController = require("./controllers/errorController");
const User = require("./models/user");

const MONGODB_URI = process.env.MONGODB_URI;
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.SESSION_SECRET || "my-super-secret-key-123"));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Session Store Configuration
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions',
    expires: 1000 * 60 * 60 * 24,
    autoRemove: 'interval',
    autoRemoveInterval: 10
});

store.on('error', function(error) {
    console.error('Session Store Error:', error);
});

app.use(session({
    secret: process.env.SESSION_SECRET || "my_secure_session_secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24
    },
    name: 'sid'
}));

app.use(flash());

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
});

// ✅ Exclude CSRF for API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        next();
    } else {
        csrfProtection(req, res, next);
    }
});

// ✅ Global Middleware
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn || false;
    res.locals.isAdmin = req.session.isAdmin || false;
    res.locals.user = req.session.user || null;
    res.locals.SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

    if (!req.path.startsWith('/api/')) {
        try {
            res.locals.csrfToken = req.csrfToken();
        } catch (err) {
            console.error('CSRF Token Error:', err);
            res.locals.csrfToken = '';
        }
    } else {
        res.locals.csrfToken = '';
    }

    res.locals.errorMessage = req.flash('error');
    res.locals.successMessage = req.flash('success');
    next();
});

// ✅ Attach User to Request
app.use(async (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            return req.session.destroy(() => res.redirect('/auth/login'));
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Session middleware error:', err);
        return req.session.destroy(() => res.redirect('/auth/login'));
    }
});

// ✅ Define Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const homeRoutes = require("./routes/homeRoutes");

app.use("/", homeRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);

// ✅ Handle Errors
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.code === 'EBADCSRFTOKEN') {
        req.flash('error', 'Invalid CSRF token. Please try again.');
        return res.redirect('back');
    }
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).render('500', {
        pageTitle: 'Error',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn || false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// ✅ Add Root Route to Fix "Not Found" Error
app.get("/", (req, res) => {
    res.send("🚀 Server is running! ✅");
});

app.get("/500", errorController.get500);
app.use(errorController.get404);

// ✅ Database Initialization & Server Start
async function initializeDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        });
        console.log("✅ Connected to MongoDB Atlas");

        await User.init();
        console.log("✅ Database indexes updated");

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Database initialization error:", err);
    }
}

// ✅ Start the database and server
initializeDatabase();
