// middleware/is-authen.js
module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn) {
      return res.redirect("/auth/login");
    }
  
    if (req.session.user.role !== 'admin') {
      return res.redirect("/"); // Redirect non-admin users
    }
  
    next();
  };
  