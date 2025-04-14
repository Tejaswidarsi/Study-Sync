const express = require('express');
const router = express.Router();
const Course = require('../models/course'); // Import your Course model

// Get all courses for the user (no specific user filtering in this basic example)
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        console.error('Error fetching courses for users:', err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

module.exports = router;