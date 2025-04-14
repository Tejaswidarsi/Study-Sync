const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  maxSize: { type: Number, required: true, min: 2, max: 10 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chat: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  resources: [
    {
      filename: { type: String, required: true }, // Store the original filename
      path: { type: String, required: true },    // Store the file path on the server
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadDate: { type: Date, default: Date.now },
    },
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Added required admin
});

groupSchema.pre('save', function (next) {
  if (this.isNew && !this.admin) {
    this.admin = this.createdBy; // Set admin to createdBy on creation
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);