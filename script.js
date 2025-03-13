// Classroom boundary configuration (polygon area)
const CLASSROOM_BOUNDARY = {
    corners: [
        { lat: 15.3928349, lng: 75.0251171 }, // corner1
        { lat: 15.3927314, lng: 75.0251674 }, // corner2
        { lat: 15.3927683, lng: 75.0252418 }, // corner3
        { lat: 15.3928711, lng: 75.0251902 }  // corner4
    ],
    // Height boundaries in meters (if you want to check vertical position)
    height: {
        min: 0,    // Ground floor
        max: 4     // Typical classroom height
    }
};

// GPS accuracy tolerance in meters
const GPS_TOLERANCE = 5;

// Mock user data (replace with actual authentication system)
const USERS = {
    students: [
        { username: 'student1', password: 'pass123', id: 'STU001', name: 'John Doe' }
    ],
    admins: [
        { username: 'admin', password: 'admin123' }
    ]
};

// DOM elements
const loginSelection = document.getElementById('loginSelection');
const loginForm = document.getElementById('loginForm');
const loginTitle = document.getElementById('loginTitle');
const loginError = document.getElementById('loginError');
const studentSection = document.getElementById('studentSection');
const adminSection = document.getElementById('adminSection');
const locationStatus = document.getElementById('locationStatus');
const attendanceForm = document.getElementById('attendanceForm');

let currentUserType = null;

// Login functions
function showLoginForm(userType) {
    currentUserType = userType;
    loginSelection.style.display = 'none';
    loginForm.style.display = 'block';
    loginTitle.textContent = userType === 'student' ? 'Student Login' : 'Admin Login';
    loginError.textContent = '';
}

function backToSelection() {
    loginSelection.style.display = 'block';
    loginForm.style.display = 'none';
    loginError.textContent = '';
    currentUserType = null;
}

function showStudentDashboard() {
    loginForm.style.display = 'none';
    studentSection.style.display = 'block';
    initGeolocation();
}

function showAdminDashboard() {
    loginForm.style.display = 'none';
    adminSection.style.display = 'block';
}

function logout() {
    location.reload();
}

// Show success notification
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'attendance-success';
    notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Login form handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (currentUserType === 'student') {
        const student = USERS.students.find(s => s.username === username && s.password === password);
        if (student) {
            showStudentDashboard();
        } else {
            loginError.textContent = 'Invalid student credentials';
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    } else if (currentUserType === 'admin') {
        const admin = USERS.admins.find(a => a.username === username && a.password === password);
        if (admin) {
            showAdminDashboard();
        } else {
            loginError.textContent = 'Invalid admin credentials';
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    }
});

// Point in polygon check with tolerance
function isPointInPolygon(point, polygon) {
    // First check exact boundary
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        
        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    // If not inside, check with tolerance
    if (!inside) {
        const distance = getDistanceFromBoundary(point);
        if (distance <= GPS_TOLERANCE) {
            inside = true;
        }
    }

    return inside;
}

function isWithinHeightBounds(altitude) {
    if (altitude === null || altitude === undefined) {
        // If altitude is not available, only check lat/long
        return true;
    }
    return altitude >= CLASSROOM_BOUNDARY.height.min &&
           altitude <= CLASSROOM_BOUNDARY.height.max;
}

function isWithinGeofence(position) {
    const point = {
        lat: position.latitude,
        lng: position.longitude
    };
    
    const withinPolygon = isPointInPolygon(point, CLASSROOM_BOUNDARY.corners);
    const withinHeight = isWithinHeightBounds(position.altitude);
    
    return withinPolygon && withinHeight;
}

function getDistanceFromBoundary(point) {
    let minDistance = Infinity;
    
    // Calculate distance to each edge of the polygon
    for (let i = 0; i < CLASSROOM_BOUNDARY.corners.length; i++) {
        const j = (i + 1) % CLASSROOM_BOUNDARY.corners.length;
        const start = CLASSROOM_BOUNDARY.corners[i];
        const end = CLASSROOM_BOUNDARY.corners[j];
        
        // Calculate distance to line segment
        const distance = distanceToLineSegment(point, start, end);
        minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
}

function distanceToLineSegment(point, start, end) {
    const R = 6371000; // Earth's radius in meters
    
    const lat1 = start.lat * Math.PI / 180;
    const lng1 = start.lng * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const lng2 = end.lng * Math.PI / 180;
    const latP = point.lat * Math.PI / 180;
    const lngP = point.lng * Math.PI / 180;
    
    // Convert to Cartesian coordinates
    const x1 = R * Math.cos(lat1) * Math.cos(lng1);
    const y1 = R * Math.cos(lat1) * Math.sin(lng1);
    const z1 = R * Math.sin(lat1);
    
    const x2 = R * Math.cos(lat2) * Math.cos(lng2);
    const y2 = R * Math.cos(lat2) * Math.sin(lng2);
    const z2 = R * Math.sin(lat2);
    
    const xP = R * Math.cos(latP) * Math.cos(lngP);
    const yP = R * Math.cos(latP) * Math.sin(lngP);
    const zP = R * Math.sin(latP);
    
    // Calculate distance
    const A = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
    const B = Math.sqrt((xP-x1)**2 + (yP-y1)**2 + (zP-z1)**2);
    const C = Math.sqrt((xP-x2)**2 + (yP-y2)**2 + (zP-z2)**2);
    
    if (B**2 > A**2 + C**2) return C;
    if (C**2 > A**2 + B**2) return B;
    
    const s = (A + B + C) / 2;
    const area = Math.sqrt(s*(s-A)*(s-B)*(s-C));
    return 2 * area / A;
}

function handleLocation(position) {
    const currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude
    };

    if (isWithinGeofence(currentPosition)) {
        updateStatusDisplay('success', 'You are within the classroom. You can mark your attendance.');
        attendanceForm.style.display = 'block';
        attendanceForm.classList.add('attendance-form-container');
    } else {
        const distance = getDistanceFromBoundary({
            lat: currentPosition.latitude,
            lng: currentPosition.longitude
        });
        updateStatusDisplay(
            'warning',
            `You must be inside the classroom to mark attendance. You are approximately ${distance.toFixed(1)} meters from the classroom boundary.`
        );
        attendanceForm.style.display = 'none';
    }
}

function handleLocationError(error) {
    let message = 'An error occurred while getting your location.';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = 'Please allow location access to mark attendance';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable';
            break;
        case error.TIMEOUT:
            message = 'Location request timed out';
            break;
    }
    
    updateStatusDisplay('error', message);
    attendanceForm.style.display = 'none';
}

function updateStatusDisplay(type, message) {
    locationStatus.className = `status-box ${type}`;
    locationStatus.innerHTML = `
        <div class="flex items-center gap-3">
            ${type === 'success' ? `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            ` : type === 'warning' ? `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ` : `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            `}
            <span>${message}</span>
        </div>
    `;
}

function initGeolocation() {
    if (!navigator.geolocation) {
        updateStatusDisplay('error', 'Geolocation is not supported by your browser');
        return;
    }

    navigator.geolocation.watchPosition(handleLocation, handleLocationError, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

// Attendance form handler
attendanceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('studentId').value;
    const name = document.getElementById('name').value;
    
    // Here you would typically send the attendance data to a server
    console.log('Attendance marked for:', { studentId, name });
    showSuccessNotification('Attendance marked successfully!');
    attendanceForm.reset();
});