const express = require('express');
const router = express.Router();
const User = require('../models/user');
const authenticate = require('../middleware/authenticate');

router.get('/profile', authenticate, async (req, res) => {
  try {
    console.log('Fetching profile for user:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/enroll', authenticate, async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.enrolledCourses) user.enrolledCourses = [];
    if (!user.enrolledCourses.includes(courseId)) {
      user.enrolledCourses.push(courseId);
      user.progress.set(courseId, 0); // Initialize progress to 0
      await user.save();
      console.log('User enrolled in course:', courseId);
    }

    res.json(user);
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ message: 'Failed to enroll in course', error: err.message });
  }
});

router.post('/update-progress', authenticate, async (req, res) => {
  try {
    const { courseId, progressValue } = req.body;
    if (!courseId || progressValue === undefined) {
      return res.status(400).json({ message: 'Course ID and progress value are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.progress.set(courseId, Math.min(Math.max(progressValue, 0), 100)); // Ensure 0-100 range
    await user.save();
    console.log('Progress updated for course:', courseId, 'to:', progressValue);
    res.json(user);
  } catch (err) {
    console.error('Progress update error:', err);
    res.status(500).json({ message: 'Failed to update progress', error: err.message });
  }
});
router.post('/unenroll', authenticate, async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.enrolledCourses && user.enrolledCourses.includes(courseId)) {
      user.enrolledCourses = user.enrolledCourses.filter(id => id.toString() !== courseId);
      user.progress.delete(courseId); // Remove progress for the unenrolled course
      await user.save();
      console.log('User unenrolled from course:', courseId);
    }

    res.json(user);
  } catch (err) {
    console.error('Unenroll error:', err);
    res.status(500).json({ message: 'Failed to unenroll from course', error: err.message });
  }
});

module.exports = router;