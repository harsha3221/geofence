const mongoose = require('mongoose');
const User = require('../models/user');

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/attendance";

async function clearUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Drop the users collection
        await User.collection.drop();
        console.log('✅ Users collection cleared successfully');

    } catch (error) {
        if (error.code === 26) {
            console.log('✅ Users collection was already empty');
        } else {
            console.error('❌ Error clearing users:', error);
        }
    } finally {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
}

clearUsers(); 