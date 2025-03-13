const express = require("express");
const adminController = require("../controllers/adminController");
const isAdmin = require('../middleware/is-admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// Protect all admin routes with authentication and admin middleware
router.use(isAuth);
router.use(isAdmin);

// Dashboard
router.get("/dashboard", adminController.getDashboard);

// Take Attendance
router.get("/take-attendance", adminController.getAttendance);
router.post("/request-locations", adminController.postRequestLocations);
router.get("/get-student-locations", adminController.getStudentLocations);
router.post("/take-attendance", adminController.postTakeAttendance);
router.post("/mark-absent", adminController.postMarkAbsent);

// View Students
router.get("/students", adminController.getStudents);

// Location request routes
router.post('/request-location/:studentId', isAuth, adminController.requestStudentLocation);
router.get('/student-location/:studentId', isAuth, adminController.getStudentLocation);
router.post('/verify-location', isAuth, adminController.verifyLocation);

module.exports = router;
