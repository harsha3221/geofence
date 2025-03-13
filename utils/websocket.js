const WebSocket = require('ws');
const { verifyLocation } = require('./geofencing');

let wss;

// Store connected students
const connectedStudents = new Map();

// Initialize WebSocket server
function initializeWebSocket(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                
                switch (data.type) {
                    case 'student_connect':
                        // Store student connection
                        connectedStudents.set(data.studentId, ws);
                        console.log(`Student ${data.studentId} connected`);
                        break;

                    case 'location_response':
                        // Handle student's location response
                        const locationValid = verifyLocation(
                            data.latitude,
                            data.longitude,
                            data.altitude,
                            data.accuracy
                        );

                        // Send location verification result to admin
                        broadcastToAdmin({
                            type: 'student_location',
                            studentId: data.studentId,
                            locationValid,
                            location: {
                                latitude: data.latitude,
                                longitude: data.longitude,
                                altitude: data.altitude,
                                accuracy: data.accuracy
                            }
                        });
                        break;

                    case 'admin_connect':
                        ws.isAdmin = true;
                        console.log('Admin connected');
                        break;

                    case 'request_location':
                        // Broadcast location request to all connected students
                        broadcastToStudents({
                            type: 'location_request',
                            message: 'Attendance being taken. Please share your location.'
                        });
                        break;
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            // Remove student from connected students if they disconnect
            for (const [studentId, socket] of connectedStudents.entries()) {
                if (socket === ws) {
                    connectedStudents.delete(studentId);
                    console.log(`Student ${studentId} disconnected`);
                    break;
                }
            }
        });
    });
}

// Broadcast message to all connected students
function broadcastToStudents(message) {
    connectedStudents.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

// Broadcast message to admin
function broadcastToAdmin(message) {
    wss.clients.forEach((client) => {
        if (client.isAdmin && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports = {
    initializeWebSocket,
    broadcastToStudents,
    broadcastToAdmin
}; 