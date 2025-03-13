// routes/home.js
const express = require('express');
const router = express.Router();

// Home Route
router.get('/', (req, res) => {
    res.render('layout/home');  // This will render views/layout/home.ejs
});

module.exports = router;
