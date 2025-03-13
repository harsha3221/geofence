require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    process.exit(1);
}

async function testConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Successfully connected to MongoDB');

        // Test creating a user with hashed password
        const hashedPassword = await bcrypt.hash('test123', 12);
        const testUser = new User({
            email: 'test@example.com',
            password: hashedPassword,
            name: 'Test User',
            role: 'admin'
        });

        await testUser.save();
        console.log('✅ Test user created successfully');

        // Test finding users
        const users = await User.find();
        console.log('Found users:', users.length);
        users.forEach(user => {
            console.log('User:', {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            });
        });

        // Cleanup
        await User.deleteOne({ email: 'test@example.com' });
        console.log('✅ Test cleanup completed');

        await mongoose.connection.close();
        console.log('✅ Connection closed');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testConnection(); 