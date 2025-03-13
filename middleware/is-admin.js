module.exports = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        req.flash('error', 'Access denied. Admin privileges required.');
        return res.redirect('/');
    }
    next();
}; 