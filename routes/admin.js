const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin');

// Protect all admin routes with authentication and admin middleware
router.use(isAuth);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Take Attendance
router.get('/take-attendance', adminController.getAttendance);
router.post('/request-locations', adminController.postRequestLocations);
router.get('/get-student-locations', adminController.getStudentLocations);
router.post('/take-attendance', adminController.postTakeAttendance);
router.post('/mark-absent', adminController.postMarkAbsent);

// View Students
router.get('/students', adminController.getStudents);

module.exports = router; 