const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  branch: String,
  yearOfStudy: Number,
  expertise: String,
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  progress: {
    type: Map,
    of: Number, // Map keys are courseIds, values are progress percentages (0-100)
    default: {}, // Initialize as an empty Map
  },
  refreshToken: String, // Add this field
});
const User = mongoose.model('User', userSchema);
module.exports = User;