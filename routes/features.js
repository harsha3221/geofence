// routes/features.js
const express = require('express');
const router = express.Router();

// Features Route
router.get('/features', (req, res) => {
    res.render('layout/features');  // This will render views/layout/features.ejs
});

module.exports = router;
