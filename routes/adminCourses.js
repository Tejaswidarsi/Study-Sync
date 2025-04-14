const express = require('express');
const router = express.Router();
const Course = require('../models/course');

// Add course
router.post('/add', async (req, res) => {
  const { title, description, videos, thumbnail,duration} = req.body;
  console.log('Received add course request with data:', { title, description, videos, thumbnail,duration }); // Log the received data
  try {
      const course = new Course({ title, description, videos, thumbnail,duration });
      console.log('Attempting to save course:', course); // Log before saving
      await course.save();
      console.log('Course saved successfully'); // Log on success
      res.json({ message: 'Course added successfully' });
  } catch (err) {
      console.error('Error during course addition:', err); // Log the error with details
      res.status(500).json({ error: err.message });
  }
});


// Delete course
router.delete('/:id', async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Course deleted' });
});

// Update course
router.put('/:id', async (req, res) => {
  const { title, description, videos, thumbnail,duration} = req.body;
  await Course.findByIdAndUpdate(req.params.id, { title, description, videos, thumbnail,duration });
  res.json({ message: 'Course updated' });
});

// Get all courses
router.get('/', async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

module.exports = router;
