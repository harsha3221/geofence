const Attendance = require("../models/attendance");
const User = require("../models/user");

// ✅ Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (!req.session.isLoggedIn || !req.user) {
    return res.redirect("/auth/login"); // Redirects unauthorized users to login
  }
  next();
};

// 🏠 Student Dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn) {
      return res.redirect("/auth/login");
    }

    // Get the user with their attendance records
    const user = await User.findById(req.user._id);
    
    // Calculate attendance statistics
    const totalClasses = user.attendance.length;
    const classesAttended = user.attendance.filter(record => record.status === 'Present').length;
    const attendancePercentage = totalClasses > 0 
      ? ((classesAttended / totalClasses) * 100).toFixed(1)
      : '0.0';

    // Get recent attendance (last 5 records)
    const recentAttendance = user.attendance
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);

    res.render("student/dashboard", {
      pageTitle: "Student Dashboard",
      path: "/student/dashboard",
      isAuthenticated: req.session.isLoggedIn,
      user: req.user,
      totalClasses,
      classesAttended,
      attendancePercentage,
      recentAttendance
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    req.flash('error', 'Failed to load dashboard data');
    next(error);
  }
};

// 📍 Check-in Page
exports.getCheckIn = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/auth/login");
  }

  res.render("student/check-in", {
    pageTitle: "Student Check-in",
    path: "/student/check-in",
    isAuthenticated: req.session.isLoggedIn,
  });
};

// ✅ Student Check-in (POST)
exports.postCheckIn = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/auth/login");
  }

  const studentId = req.user._id;
  const checkInTime = new Date();
  const today = new Date().setHours(0, 0, 0, 0); // Normalize to start of the day

  // Check if the student has already checked in today
  Attendance.findOne({ studentId, checkInTime: { $gte: today } })
    .then((existingRecord) => {
      if (existingRecord) {
        console.log("⚠️ Already checked in today!");
        return res.redirect("/student/attendance");
      }

      // If not, create a new check-in record
      const attendance = new Attendance({ studentId, checkInTime });
      return attendance.save();
    })
    .then(() => res.redirect("/student/attendance"))
    .catch((err) => {
      console.error("❌ Error in check-in:", err);
      res.status(500).send("Internal Server Error");
    });
};

// 📊 Fetch Attendance
exports.getAttendance = async (req, res) => {
  try {
    const ITEMS_PER_PAGE = 10;
    const page = parseInt(req.query.page) || 1;
    const month = req.query.month;
    const status = req.query.status;

    // Build query filters
    const query = { _id: req.user._id };
    const attendanceFilter = {};

    if (month) {
      const startDate = new Date(new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(new Date().getFullYear(), month, 0);
      attendanceFilter['attendance.date'] = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (status) {
      attendanceFilter['attendance.status'] = status;
    }

    // Get user with filtered attendance
    const user = await User.findOne(query)
      .populate({
        path: 'attendance.verifiedBy',
        select: 'name'
      });

    // Filter and sort attendance records
    let attendance = user.attendance;
    
    if (month || status) {
      attendance = attendance.filter(record => {
        let matches = true;
        if (month) {
          matches = matches && record.date.getMonth() === (month - 1);
        }
        if (status) {
          matches = matches && record.status === status;
        }
        return matches;
      });
    }

    // Sort by date descending
    attendance.sort((a, b) => b.date - a.date);

    // Calculate pagination
    const totalItems = attendance.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const paginatedAttendance = attendance.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Calculate statistics
    const totalClasses = attendance.length;
    const presentCount = attendance.filter(record => record.status === 'Present').length;
    const absentCount = attendance.filter(record => record.status === 'Absent').length;
    const attendancePercentage = totalClasses > 0 
      ? ((presentCount / totalClasses) * 100).toFixed(1)
      : '0.0';

    res.render('student/attendance', {
      pageTitle: 'My Attendance',
      path: '/student/attendance',
      attendance: paginatedAttendance,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: totalPages,
      totalClasses,
      presentCount,
      absentCount,
      attendancePercentage
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    req.flash('error', 'Failed to load attendance records');
    res.redirect('/student/dashboard');
  }
};

// 🧑‍🎓 Profile Page
exports.getProfile = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/auth/login");
  }

  res.render("student/profile", {
    pageTitle: "My Profile",
    path: "/student/profile",
    student: req.user,
    isAuthenticated: req.session.isLoggedIn,
  });
};

// 📝 Update Profile
exports.postUpdateProfile = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/auth/login");
  }

  const { name, email, rollNo } = req.body;

  User.findById(req.user._id)
    .then((student) => {
      if (!student) {
        return res.redirect("/auth/login");
      }

      student.name = name;
      student.email = email;
      student.rollNo = rollNo;

      return student.save();
    })
    .then(() => {
      console.log("✅ Profile updated successfully!");
      res.redirect("/student/profile");
    })
    .catch((err) => {
      console.error("❌ Error updating profile:", err);
      res.status(500).send("Internal Server Error");
    });
};
