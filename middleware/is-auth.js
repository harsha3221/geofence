module.exports = (req, res, next) => {
    // Check if user is authenticated
    if (!req.session.isLoggedIn) {
        req.flash('error', 'Please log in first');
        return res.redirect('/auth/login');
    }
    next();
}; 