const https = require('https');
const fs = require('fs');
const path = require('path');

const iconUrls = {
    // Features page icons
    'geofencing.png': 'https://img.icons8.com/color/96/000000/map-marker.png',
    'dashboard.png': 'https://img.icons8.com/color/96/000000/dashboard-layout.png',
    'security.png': 'https://img.icons8.com/color/96/000000/shield.png',
    'notification.png': 'https://img.icons8.com/color/96/000000/appointment-reminders.png',
    'analytics.png': 'https://img.icons8.com/color/96/000000/analytics.png',
    'mobile.png': 'https://img.icons8.com/color/96/000000/smartphone.png',
    'location.png': 'https://img.icons8.com/color/96/000000/place-marker.png',
    'scalability.png': 'https://img.icons8.com/color/96/000000/resize-diagonal.png',
    'interface.png': 'https://img.icons8.com/color/96/000000/touchscreen.png',
    'customization.png': 'https://img.icons8.com/color/96/000000/settings.png',
    
    // About page icons
    'accuracy.png': 'https://img.icons8.com/color/96/000000/accuracy.png',
    'efficiency.png': 'https://img.icons8.com/color/96/000000/performance-improvement.png',
    'reliability.png': 'https://img.icons8.com/color/96/000000/verified-badge.png',
    'tech-illustration.png': 'https://img.icons8.com/color/480/000000/technology-items.png'
};

const iconDir = path.join(__dirname, 'public', 'images', 'icons');

// Create directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Download each icon
Object.entries(iconUrls).forEach(([filename, url]) => {
    const filePath = path.join(iconDir, filename);
    https.get(url, (response) => {
        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            console.log(`Downloaded: ${filename}`);
        });
    }).on('error', (err) => {
        console.error(`Error downloading ${filename}:`, err.message);
    });
}); 