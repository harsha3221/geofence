const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSchema = new Schema({
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
    accuracy: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const attendanceSchema = new Schema({
    date: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        enum: ["Present", "Absent"], 
        required: true 
    },
    location: locationSchema,
    verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: ['student', 'admin'],
        default: 'student'
    },
    rollNo: {
        type: String,
        required: function() {
            return this.role === 'student';
        }
    },
    currentSemester: {
        type: Number,
        default: 1
    },
    attendance: [{
        date: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent'],
            required: true
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                required: true
            }
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    lastLocation: {
        coordinates: {
            type: [Number],
            default: null
        },
        altitude: Number,
        accuracy: Number,
        timestamp: Date
    },
    subjects: [{
        name: String,
        semester: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create indexes
userSchema.index({ 'attendance.date': 1 });
userSchema.index({ 'lastLocation.coordinates': '2dsphere' });
userSchema.index({ rollNo: 1 }, { 
    unique: true,
    partialFilterExpression: { 
        role: 'student',
        rollNo: { $exists: true }
    }
});

// Pre-save middleware to validate rollNo for students
userSchema.pre('save', function(next) {
    if (this.role === 'student' && !this.rollNo) {
        next(new Error('Roll number is required for students'));
    } else {
        next();
    }
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Method to check if user is within campus premises
userSchema.methods.isWithinCampus = function(campusLocation) {
    if (!this.lastLocation) return false;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = this.lastLocation.coordinates[1] * Math.PI/180; // latitude
    const φ2 = campusLocation.latitude * Math.PI/180;
    const Δφ = (campusLocation.latitude - this.lastLocation.coordinates[1]) * Math.PI/180;
    const Δλ = (campusLocation.longitude - this.lastLocation.coordinates[0]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= campusLocation.radius;
};

// Method to update user's location
userSchema.methods.updateLocation = async function(latitude, longitude, altitude, accuracy) {
    this.lastLocation = {
        coordinates: [longitude, latitude],
        altitude: altitude || null,
        accuracy: accuracy || null,
        timestamp: new Date()
    };
    return this.save();
};

// Method to mark attendance
userSchema.methods.markAttendance = async function(subject, status, location, verifiedBy) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance already marked for this subject today
    const existingAttendance = this.attendance.find(a => 
        a.subject === subject && 
        new Date(a.date).setHours(0,0,0,0) === today.getTime()
    );

    if (existingAttendance) {
        throw new Error('Attendance already marked for this subject today');
    }

    this.attendance.push({
        date: new Date(),
        status,
        location,
        verifiedBy,
        subject,
        semester: this.currentSemester
    });

    return this.save();
};

// Method to get attendance percentage
userSchema.methods.getAttendancePercentage = function(subject, startDate, endDate) {
    let attendanceRecords = this.attendance;
    
    if (subject) {
        attendanceRecords = attendanceRecords.filter(a => a.subject === subject);
    }
    
    if (startDate) {
        attendanceRecords = attendanceRecords.filter(a => a.date >= startDate);
    }
    
    if (endDate) {
        attendanceRecords = attendanceRecords.filter(a => a.date <= endDate);
    }

    const totalClasses = attendanceRecords.length;
    const presentClasses = attendanceRecords.filter(a => a.status === 'Present').length;

    return totalClasses === 0 ? 0 : (presentClasses / totalClasses) * 100;
};

// Static method to find students in classroom
userSchema.statics.findStudentsInClassroom = async function(boundary) {
    return this.find({
        role: "student",
        "lastLocation.coordinates": {
            $geoWithin: {
                $polygon: boundary.corners.map(corner => [corner.lng, corner.lat])
            }
        }
    }).cursor();
};

// Method to get monthly attendance report
userSchema.methods.getMonthlyAttendanceReport = function(month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const monthlyAttendance = this.attendance.filter(record => 
        record.date >= startDate && record.date <= endDate
    );

    const subjectWiseAttendance = {};
    
    monthlyAttendance.forEach(record => {
        if (!subjectWiseAttendance[record.subject]) {
            subjectWiseAttendance[record.subject] = {
                total: 0,
                present: 0
            };
        }
        
        subjectWiseAttendance[record.subject].total++;
        if (record.status === 'Present') {
            subjectWiseAttendance[record.subject].present++;
        }
    });

    // Calculate percentages
    Object.keys(subjectWiseAttendance).forEach(subject => {
        const { total, present } = subjectWiseAttendance[subject];
        subjectWiseAttendance[subject].percentage = 
            total === 0 ? 0 : ((present / total) * 100).toFixed(2);
    });

    return {
        totalClasses: monthlyAttendance.length,
        presentClasses: monthlyAttendance.filter(r => r.status === 'Present').length,
        subjectWise: subjectWiseAttendance
    };
};

const User = mongoose.model("User", userSchema);

module.exports = User;
