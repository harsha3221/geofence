const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["Present", "Absent"], 
    required: true 
  },
  location: { 
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    altitude: Number,
    accuracy: Number
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationMethod: {
    type: String,
    enum: ['GPS', 'Manual', 'Auto'],
    default: 'GPS'
  },
  remarks: String,
  semester: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  classStartTime: {
    type: Date,
    required: true
  },
  classEndTime: {
    type: Date,
    required: true
  }
});

// Create indexes
attendanceSchema.index({ student: 1, date: 1 }); // For querying student's attendance by date
attendanceSchema.index({ date: 1, status: 1 }); // For attendance reports
attendanceSchema.index({ "location.coordinates": "2dsphere" }); // For geospatial queries

// Static method to get student's attendance percentage
attendanceSchema.statics.getAttendanceStats = async function(studentId, startDate, endDate) {
  const match = {
    student: studentId,
    date: {}
  };
  
  if (startDate) match.date.$gte = startDate;
  if (endDate) match.date.$lte = endDate;

  const stats = await this.aggregate([
    { $match: match },
    { 
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        totalPresent: {
          $sum: {
            $cond: [{ $eq: ["$status", "Present"] }, 1, 0]
          }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalClasses: 0,
      totalPresent: 0,
      attendancePercentage: 0
    };
  }

  const { totalClasses, totalPresent } = stats[0];
  return {
    totalClasses,
    totalPresent,
    attendancePercentage: ((totalPresent / totalClasses) * 100).toFixed(2)
  };
};

// Method to check if attendance can be marked
attendanceSchema.statics.canMarkAttendance = async function(studentId, date, subject) {
  // Check if attendance already marked for this class
  const existingAttendance = await this.findOne({
    student: studentId,
    subject: subject,
    date: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    }
  });

  return !existingAttendance;
};

// Method to get monthly attendance report
attendanceSchema.statics.getMonthlyReport = async function(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          student: "$student",
          status: "$status"
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.student",
        attendance: {
          $push: {
            status: "$_id.status",
            count: "$count"
          }
        }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "studentInfo"
      }
    },
    {
      $unwind: "$studentInfo"
    },
    {
      $project: {
        name: "$studentInfo.name",
        rollNo: "$studentInfo.rollNo",
        attendance: 1
      }
    }
  ]);
};

module.exports = mongoose.model("Attendance", attendanceSchema);
