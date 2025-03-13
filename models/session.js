const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    loginTimestamp: {
        type: Date,
        default: Date.now
    },
    lastActivityTimestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number
    },
    deviceInfo: {
        type: String
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

// Method to check if session is expired
sessionSchema.methods.isExpired = function() {
    return Date.now() >= this.expiresAt;
};

// Method to update last activity
sessionSchema.methods.updateActivity = function() {
    this.lastActivityTimestamp = Date.now();
    return this.save();
};

// Method to invalidate session
sessionSchema.methods.invalidate = function() {
    this.isActive = false;
    return this.save();
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpiredSessions = function() {
    return this.deleteMany({
        $or: [
            { isActive: false },
            { expiresAt: { $lte: new Date() } }
        ]
    });
};

// Static method to get active session for user
sessionSchema.statics.getActiveSession = function(userId) {
    return this.findOne({
        userId: userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });
};

module.exports = mongoose.model('Session', sessionSchema); 