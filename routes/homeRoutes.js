const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
    res.render('layout/home', {
        pageTitle: 'Home',
        path: '/',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Features page
router.get('/features', (req, res) => {
    res.render('layout/features', {
        pageTitle: 'Features',
        path: '/features',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// About page
router.get('/about', (req, res) => {
    // Data for team members and milestones
    const teamMembers = [
        {
            name: 'Alex Johnson',
            role: 'CEO & Founder',
            image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        {
            name: 'Sarah Williams',
            role: 'CTO',
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        {
            name: 'Michael Chen',
            role: 'Lead Developer',
            image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
    ];

    const milestones = [
        {
            year: '2023',
            title: 'Project Launch',
            description: 'Initial release of GeoAttend with core features',
        },
        {
            year: '2024',
            title: 'Mobile App Release',
            description: 'Launch of iOS and Android applications',
        },
        {
            year: '2025',
            title: 'Enterprise Integration',
            description: 'Advanced features for large-scale deployment',
        },
    ];

    res.render('layout/about', {
        pageTitle: 'About',
        path: '/about',
        error: req.flash('error'),
        success: req.flash('success'),
        teamMembers: teamMembers,
        milestones: milestones,
        user: req.user
    });
});

module.exports = router; 