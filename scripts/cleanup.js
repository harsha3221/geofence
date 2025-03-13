const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';

async function cleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Drop the sessions collection
        console.log('Dropping sessions collection...');
        await mongoose.connection.db.collection('sessions').drop().catch(() => {
            console.log('No sessions collection found');
        });

        // Remove all indexes from the sessions collection
        console.log('Removing session indexes...');
        await mongoose.connection.db.collection('sessions').dropIndexes().catch(() => {
            console.log('No session indexes to remove');
        });

        // Drop existing indexes from users collection
        console.log('Dropping existing user indexes...');
        await mongoose.connection.db.collection('users').dropIndexes().catch(() => {
            console.log('No user indexes to remove');
        });

        // Rebuild indexes for the User collection
        console.log('Rebuilding User collection indexes...');
        const User = require('../models/user');
        await User.syncIndexes({ background: true });
        
        console.log('✅ Cleanup completed successfully');
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

cleanup(); 