const mongoose = require('mongoose');
const User = require('../models/user');

const MONGODB_URI = 'mongodb+srv://harshadhulipalla6:Loyola%403221@cluster0.shap7.mongodb.net/attendance';

async function clearDatabase() {
    try {
        console.log('🗑️ Starting database cleanup...');
        
        // Delete all users and their attendance records
        await User.deleteMany({});
        console.log('✅ All users and attendance records deleted');
        
        // Drop the sessions collection to remove any problematic indexes
        if (mongoose.connection.collections['sessions']) {
            await mongoose.connection.collections['sessions'].drop();
            console.log('✅ All sessions cleared');

            // Recreate sessions collection with proper schema
            await mongoose.connection.createCollection('sessions', {
                validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["expires"],
                        properties: {
                            expires: {
                                bsonType: "date"
                            }
                        }
                    }
                }
            });
            console.log('✅ Sessions collection recreated with proper schema');
        }

        console.log('✅ Database cleanup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
        process.exit(1);
    }
}

// Connect to MongoDB and clear data
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('📊 Connected to MongoDB Atlas');
        return clearDatabase();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }); 