module.exports = (req, res, next) => {
  console.log("🔒 Checking admin access:", {
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user,
    path: req.path
  });

  if (!req.session.isLoggedIn) {
    console.log("❌ User not logged in");
    req.flash('error', 'Please log in first');
    return res.redirect('/auth/login');
  }
  
  if (!req.session.user || req.session.user.role !== 'admin') {
    console.log("❌ Not an admin user:", {
      hasUser: !!req.session.user,
      role: req.session.user ? req.session.user.role : 'none'
    });
    req.flash('error', 'Access denied. Admin privileges required.');
    return res.redirect('/');
  }
  
  console.log("✅ Admin access granted");
  next();
}; 