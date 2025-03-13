const express = require("express");
const { check, body } = require("express-validator");
const authController = require("../controllers/authenticationController");
const User = require("../models/user");

const router = express.Router();

// 🏠 Login Route
router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password", "Please enter a correct password.")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

// 🖥️ Register Route
router.get("/register", authController.getRegister);

router.post(
  "/register",
  [
    // Name validation
    body("name", "Name is required")
      .trim()
      .not()
      .isEmpty(),
    
    // Email validation
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail()
      .custom((value) => {
        return User.findOne({ email: value }).then(userDoc => {
          if (userDoc) {
            return Promise.reject("Email already exists, please choose another email");
          }
          return true;
        });
      }),
    
    // Roll number validation - only for students
    body("rollNo")
      .trim()
      .custom((value, { req }) => {
        if (req.body.userType === 'student' && !value) {
          throw new Error("Roll number is required for students");
        }
        if (value) {
          return User.findOne({ rollNo: value }).then(userDoc => {
            if (userDoc) {
              return Promise.reject("Roll number already exists");
            }
            return true;
          });
        }
        return true;
      }),
    
    // Password validation
    body("password")
      .trim()
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters long")
      .matches(/^[a-zA-Z0-9]+$/)
      .withMessage("Password can only contain letters and numbers"),
    
    // Confirm password validation
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      })
  ],
  authController.postRegister
);

// 🛑 Logout Route - Only POST method
router.post("/logout", authController.postLogout);

// ✅ Admin Check Middleware
router.use((req, res, next) => {
  if (req.session.user && req.session.user.email !== "vivekraj@iiitdwd.ac.in") {
    return res.redirect("/login"); // Redirect non-admins to login
  }
  next();
});

module.exports = router;
