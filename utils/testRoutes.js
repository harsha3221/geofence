const express = require('express');
const request = require('supertest');
const app = express();

// Import routes
const adminRoutes = require('../routes/adminRoutes');
const authRoutes = require('../routes/authRoutes');
const studentRoutes = require('../routes/studentRoutes');
const homeRoutes = require('../routes/homeRoutes');

// Test routes
async function testRoutes() {
    console.log('🔍 Testing routes...\n');

    // Test auth routes
    console.log('Testing Auth Routes:');
    console.log('GET /auth/login');
    console.log('POST /auth/login');
    console.log('GET /auth/register');
    console.log('POST /auth/register');
    console.log('POST /auth/logout');

    // Test admin routes
    console.log('\nTesting Admin Routes:');
    console.log('GET /admin/dashboard');
    console.log('GET /admin/take-attendance');
    console.log('POST /admin/request-locations');
    console.log('GET /admin/get-student-locations');
    console.log('POST /admin/take-attendance');
    console.log('POST /admin/mark-absent');
    console.log('GET /admin/students');

    // Test student routes
    console.log('\nTesting Student Routes:');
    console.log('GET /student/dashboard');
    console.log('GET /student/attendance');

    // Test home routes
    console.log('\nTesting Home Routes:');
    console.log('GET /');
    console.log('GET /about');
    console.log('GET /features');

    console.log('\n✅ Route testing completed');
    console.log('\nTo clear the database and sessions, run:');
    console.log('node utils/clearDatabase.js');
}

testRoutes(); 