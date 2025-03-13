const User = require("../models/user");
const { verifyLocation } = require('../utils/geofencing');

// Store student locations temporarily
const studentLocations = new Map();

// Campus location coordinates (KLE Tech University boundaries)
const CAMPUS_BOUNDARIES = {
    corners: [
        { lat: 15.3928349, lng: 75.0251171 }, // corner1
        { lat: 15.3927314, lng: 75.0251674 }, // corner2
        { lat: 15.3927683, lng: 75.0252418 }, // corner3
        { lat: 15.3928711, lng: 75.0251902 }  // corner4
    ]
};

// Function to check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        
        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's attendance
        const todayAttendance = await User.aggregate([
            {
                $match: {
                    role: 'student',
                    'attendance.date': {
                        $gte: today,
                        $lt: tomorrow
                    }
                }
            },
            {
                $project: {
                    todayAttendance: {
                        $filter: {
                            input: '$attendance',
                            as: 'attend',
                            cond: {
                                $and: [
                                    { $gte: ['$$attend.date', today] },
                                    { $lt: ['$$attend.date', tomorrow] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        const presentToday = todayAttendance.filter(student => 
            student.todayAttendance.some(a => a.status === 'Present')
        ).length;

        const absentToday = totalStudents - presentToday;
        const attendanceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : 0;

        // Get recent activity
        const recentActivity = await User.aggregate([
            { $match: { role: 'student' } },
            { $unwind: '$attendance' },
            { $sort: { 'attendance.date': -1 } },
            { $limit: 5 },
            {
                $project: {
                    time: { $dateToString: { format: "%H:%M", date: "$attendance.date" } },
                    description: {
                        $concat: [
                            "$name",
                            " was marked ",
                            "$attendance.status"
                        ]
                    }
                }
            }
        ]);

        res.render('admin/dashboard', {
            pageTitle: 'Admin Dashboard',
            path: '/admin/dashboard',
            user: req.user,
            stats: {
                totalStudents,
                presentToday,
                absentToday,
                attendanceRate
            },
            recentActivity,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        req.flash('error', 'Failed to load dashboard data');
        res.redirect('/');
    }
};

// Get Students List
exports.getStudents = async (req, res, next) => {
    try {
        const students = await User.find({ role: 'student' });
        
        const studentsWithStats = students.map(student => {
            const totalDays = student.attendance.length;
            const presentDays = student.attendance.filter(a => a.status === 'Present').length;
            const attendancePercentage = totalDays > 0 ? (presentDays / totalDays * 100).toFixed(2) : 0;

            return {
                id: student._id,
                name: student.name,
                rollNo: student.rollNo,
                email: student.email,
                totalDays,
                presentDays,
                attendancePercentage
            };
        });

        res.render('admin/students', {
            pageTitle: 'View Students',
            path: '/admin/students',
            students: studentsWithStats
        });
    } catch (err) {
        next(err);
    }
};

// Take Attendance Page
exports.getAttendance = async (req, res, next) => {
    try {
        const students = await User.find({ role: 'student' });
        const summary = {
            total: students.length,
            present: 0,
            notMarked: students.length,
            students: students.map(student => ({
                id: student._id,
                name: student.name,
                rollNo: student.rollNo,
                status: 'Not Marked'
            }))
        };

        // Update summary with today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const student of students) {
            const todayAttendance = student.attendance.find(a => {
                const attendanceDate = new Date(a.date);
                attendanceDate.setHours(0, 0, 0, 0);
                return attendanceDate.getTime() === today.getTime();
            });

            if (todayAttendance) {
                const studentSummary = summary.students.find(s => s.id.toString() === student._id.toString());
                if (studentSummary) {
                    studentSummary.status = todayAttendance.status;
                    if (todayAttendance.status === 'Present') {
                        summary.present++;
                        summary.notMarked--;
                    }
                }
            }
        }

        res.render('admin/take-attendance', {
            pageTitle: 'Take Attendance',
            path: '/admin/take-attendance',
            summary: summary,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (err) {
        next(err);
    }
};

// Request Student Locations
exports.postRequestLocations = async (req, res) => {
    try {
        studentLocations.clear();
        res.json({ success: true });
    } catch (error) {
        console.error('Error requesting locations:', error);
        res.status(500).json({ success: false, message: 'Failed to request locations' });
    }
};

// Get Student Locations
exports.getStudentLocations = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' });
        const studentData = students.map(student => {
            const location = studentLocations.get(student._id.toString());
            return {
                id: student._id,
                name: student.name,
                status: student.attendance.find(a => {
                    const today = new Date();
                    const attendanceDate = new Date(a.date);
                    return attendanceDate.toDateString() === today.toDateString();
                })?.status || 'Not Marked',
                location: location ? {
                    ...location,
                    isWithinBoundary: verifyLocation(location).isWithinClassroom
                } : null
            };
        });

        res.json({ success: true, students: studentData });
    } catch (error) {
        console.error('Error getting student locations:', error);
        res.status(500).json({ success: false, message: 'Failed to get student locations' });
    }
};

// Mark Attendance
exports.postTakeAttendance = async (req, res) => {
    try {
        const { studentId, latitude, longitude, altitude, accuracy } = req.body;

        // Verify location
        const locationVerification = verifyLocation({ latitude, longitude, altitude, accuracy });
        if (!locationVerification.isWithinClassroom) {
            return res.status(400).json({
                success: false,
                message: locationVerification.message
            });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Check if attendance is already marked for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingAttendance = student.attendance.find(a => {
            const attendanceDate = new Date(a.date);
            attendanceDate.setHours(0, 0, 0, 0);
            return attendanceDate.getTime() === today.getTime();
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: 'Attendance already marked for today'
            });
        }

        // Mark attendance
        student.attendance.push({
            date: new Date(),
            status: 'Present',
            location: {
                coordinates: [longitude, latitude],
                altitude,
                accuracy
            },
            verifiedBy: req.user._id
        });

        await student.save();

        res.json({
            success: true,
            message: 'Attendance marked successfully'
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance'
        });
    }
};

// Mark Absent
exports.postMarkAbsent = async (req, res) => {
    try {
        const { studentId } = req.body;

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Check if attendance is already marked for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingAttendance = student.attendance.find(a => {
            const attendanceDate = new Date(a.date);
            attendanceDate.setHours(0, 0, 0, 0);
            return attendanceDate.getTime() === today.getTime();
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: 'Attendance already marked for today'
            });
        }

        // Mark as absent
        student.attendance.push({
            date: new Date(),
            status: 'Absent',
            verifiedBy: req.user._id
        });

        await student.save();

        res.json({
            success: true,
            message: 'Student marked as absent'
        });
    } catch (error) {
        console.error('Error marking absent:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark absent'
        });
    }
};

// Request student location
exports.requestStudentLocation = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = await User.findById(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Store the location request in the student's document
        student.locationRequested = true;
        student.locationRequestedAt = new Date();
        await student.save();

        res.json({
            success: true,
            message: 'Location request sent to student'
        });
    } catch (error) {
        console.error('Error requesting student location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to request student location'
        });
    }
};

// Get student location
exports.getStudentLocation = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = await User.findById(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        if (!student.lastLocation) {
            return res.json({
                success: true,
                location: null
            });
        }

        res.json({
            success: true,
            location: student.lastLocation
        });
    } catch (error) {
        console.error('Error getting student location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get student location'
        });
    }
};

// Verify location
exports.verifyLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                isValid: false,
                message: 'Latitude and longitude are required'
            });
        }

        const locationCheck = verifyLocation(latitude, longitude);
        res.json(locationCheck);
    } catch (error) {
        console.error('Error verifying location:', error);
        res.status(500).json({
            isValid: false,
            message: 'Failed to verify location'
        });
    }
};
