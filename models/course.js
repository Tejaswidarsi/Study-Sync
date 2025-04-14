// models/Course.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  videos: [String] ,// URLs or IDs of videos
  thumbnail: String ,
  duration: Number,
});

module.exports = mongoose.model('Course', courseSchema);
