// Classroom boundary configuration with exact coordinates
const CLASSROOM_BOUNDARY = {
    corners: [
        { lat: 15.392772860676557, lng: 75.02528054686816 }, // Corner 1 (West-North)
        { lat: 15.392771453831738, lng: 75.02527288989403 }, // Corner 2 (East-North)
        { lat: 15.392729678242686, lng: 75.02526209896294 }, // Corner 3 (East-South)
        { lat: 15.3927862125031, lng: 75.0252659923259 }     // Corner 4 (West-South)
    ],
    height: {
        min: 0,    // Ground floor (meters)
        max: 4     // Ceiling level (meters)
    }
};

// Update GPS tolerance to be more lenient
const GPS_TOLERANCE = 150; // Increased from 5m to 150m for testing

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Calculate if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        
        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Calculate minimum distance to polygon edges
function getDistanceFromBoundary(point) {
    let minDistance = Infinity;
    
    // Check distance to each edge
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

// Calculate distance from point to line segment
function distanceToLineSegment(point, start, end) {
    const R = 6371e3; // Earth's radius in meters
    
    // Convert to radians
    const lat1 = start.lat * Math.PI/180;
    const lon1 = start.lng * Math.PI/180;
    const lat2 = end.lat * Math.PI/180;
    const lon2 = end.lng * Math.PI/180;
    const latP = point.lat * Math.PI/180;
    const lonP = point.lng * Math.PI/180;
    
    // Convert to Cartesian coordinates
    const x1 = R * Math.cos(lat1) * Math.cos(lon1);
    const y1 = R * Math.cos(lat1) * Math.sin(lon1);
    const z1 = R * Math.sin(lat1);
    
    const x2 = R * Math.cos(lat2) * Math.cos(lon2);
    const y2 = R * Math.cos(lat2) * Math.sin(lon2);
    const z2 = R * Math.sin(lat2);
    
    const xP = R * Math.cos(latP) * Math.cos(lonP);
    const yP = R * Math.cos(latP) * Math.sin(lonP);
    const zP = R * Math.sin(latP);
    
    // Calculate vectors
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    
    // Calculate projection
    const t = ((xP - x1) * dx + (yP - y1) * dy + (zP - z1) * dz) / 
             (dx * dx + dy * dy + dz * dz);
    
    let distance;
    if (t < 0) {
        // Point is beyond start of line segment
        distance = Math.sqrt((xP - x1) * (xP - x1) + 
                           (yP - y1) * (yP - y1) + 
                           (zP - z1) * (zP - z1));
    } else if (t > 1) {
        // Point is beyond end of line segment
        distance = Math.sqrt((xP - x2) * (xP - x2) + 
                           (yP - y2) * (yP - y2) + 
                           (zP - z2) * (zP - z2));
    } else {
        // Perpendicular distance to line segment
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const projZ = z1 + t * dz;
        distance = Math.sqrt((xP - projX) * (xP - projX) + 
                           (yP - projY) * (yP - projY) + 
                           (zP - projZ) * (zP - projZ));
    }
    
    return distance;
}

// Check if height is within allowed range
function isHeightValid(altitude) {
    if (altitude === null || altitude === undefined) {
        return true; // If altitude not available, only check horizontal position
    }
    return altitude >= CLASSROOM_BOUNDARY.height.min && 
           altitude <= CLASSROOM_BOUNDARY.height.max;
}

// Main function to verify location
function verifyLocation(latitude, longitude, altitude, accuracy) {
    // Parse and validate inputs
    const point = {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude)
    };

    if (isNaN(point.lat) || isNaN(point.lng)) {
        return {
            isValid: false,
            message: "Invalid GPS coordinates provided",
            distance: Infinity,
            withinPolygon: false,
            heightValid: false
        };
    }

    // Check if accuracy is within acceptable range
    if (accuracy && accuracy > GPS_TOLERANCE) {
        return {
            isValid: false,
            message: `GPS accuracy is ${Math.round(accuracy)}m. For better results:
                     - Move to an area with clear sky view
                     - Wait for better GPS signal
                     - Stay away from tall buildings`,
            distance: Infinity,
            withinPolygon: false,
            heightValid: false,
            accuracyTooLow: true
        };
    }

    // Check if point is within polygon
    const withinPolygon = isPointInPolygon(point, CLASSROOM_BOUNDARY.corners);
    
    // Calculate distance to boundary
    const distance = getDistanceFromBoundary(point);
    
    // Check height if available
    const heightValid = isHeightValid(altitude);

    // Point is inside polygon or within tolerance
    if (withinPolygon || distance <= GPS_TOLERANCE) {
        if (!heightValid && altitude !== null) {
            return {
                isValid: false,
                message: `Height ${Math.round(altitude)}m is outside allowed range (${CLASSROOM_BOUNDARY.height.min}-${CLASSROOM_BOUNDARY.height.max}m)`,
                distance,
                withinPolygon,
                heightValid: false
            };
        }
        return {
            isValid: true,
            message: "Location verified successfully",
            distance,
            withinPolygon,
            heightValid
        };
    }

    // Point is outside polygon and tolerance
    return {
        isValid: false,
        message: `Location is ${Math.round(distance)}m from classroom boundary. Please ensure you are inside the classroom.`,
        distance,
        withinPolygon: false,
        heightValid
    };
}

// Function to get classroom boundary
function getClassroomBoundary() {
    return CLASSROOM_BOUNDARY;
}

module.exports = {
    verifyLocation,
    getClassroomBoundary,
    GPS_TOLERANCE,
    isPointInPolygon,
    getDistanceFromBoundary,
    isHeightValid
}; 