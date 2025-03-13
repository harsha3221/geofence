const mongoose = require('mongoose');

// Database operation logger
const logDbOperation = (operation, data) => {
    console.log(`\n📝 Database Operation: ${operation}`);
    console.log('Time:', new Date().toISOString());
    console.log('Data:', JSON.stringify(data, null, 2));
};

// Error logger
const logDbError = (operation, error) => {
    console.error(`\n❌ Database Error in ${operation}`);
    console.error('Time:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Stack:', error.stack);
};

// Connection state logger
const logConnectionState = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    console.log(`\n📡 MongoDB Connection State: ${states[mongoose.connection.readyState]}`);
};

// Verify database connection
const verifyConnection = async () => {
    try {
        await mongoose.connection.db.admin().ping();
        console.log('✅ Database connection verified');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};

// Verify collection exists
const verifyCollection = async (collectionName) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const exists = collections.some(col => col.name === collectionName);
        console.log(`${exists ? '✅' : '❌'} Collection '${collectionName}' ${exists ? 'exists' : 'does not exist'}`);
        return exists;
    } catch (error) {
        console.error(`❌ Error verifying collection '${collectionName}':`, error);
        return false;
    }
};

module.exports = {
    logDbOperation,
    logDbError,
    logConnectionState,
    verifyConnection,
    verifyCollection
}; 