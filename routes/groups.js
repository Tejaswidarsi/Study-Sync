const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const Group = require('../models/groups');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  },
});
const upload = multer({ storage: storage });

router.get('/', authenticate, async (req, res) => {
  console.log('Route /api/group hit for user:', req.user?.id || 'No user ID');
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const groups = await Group.aggregate([
      {
        $match: {
          $or: [
            { // Joinable groups
              $expr: { $gt: ['$maxSize', { $size: '$members' }] },
              members: { $ne: userId },
            },
            { // Joined groups
              members: userId,
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members',
          foreignField: '_id',
          as: 'memberDetails',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'admin',
          foreignField: '_id',
          as: 'adminDetails',
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          maxSize: 1,
          members: { $map: { input: '$memberDetails', as: 'member', in: { _id: '$$member._id', name: '$$member.name', email: '$$member.email' } } },
          chat: 1,
          resources: 1,
          createdBy: { $arrayElemAt: ['$creator', 0] },
          admin: { $arrayElemAt: ['$adminDetails', 0] },
          groupId: 1,
        },
      },
    ]);

    console.log('Found groups:', groups);
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ message: 'Failed to fetch groups', error: err.message });
  }
});
router.post('/clear-chat', authenticate, async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ message: 'Group ID is required' });

    const group = await Group.findOne({ groupId });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.includes(new mongoose.Types.ObjectId(req.user.id))) {
      return res.status(403).json({ message: 'Not a member' });
    }

    group.chat = []; // Clear chat history
    await group.save();
    res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (err) {
    console.error('Error clearing chat:', err);
    res.status(500).json({ message: 'Failed to clear chat', error: err.message });
  }
});

router.post('/create-group', authenticate, async (req, res) => {
  try {
    const { name, description, maxSize } = req.body;
    if (!name || !maxSize) {
      return res.status(400).json({ message: 'Name and maxSize are required' });
    }

    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdBy = new mongoose.Types.ObjectId(req.user.id);
    const group = new Group({
      groupId,
      name,
      description: description || '',
      maxSize: parseInt(maxSize, 10),
      members: [new mongoose.Types.ObjectId(req.user.id)],
      chat: [],
      resources: [],
      createdBy,
    });

    await group.save();
    const populatedGroup = await Group.findOne({ groupId })
      .populate('members', 'name email')
      .populate('createdBy', 'name')
      .populate('admin', 'name');
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ message: 'Failed to create group', error: err.message });
  }
});

router.post('/join-group', authenticate, async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ message: 'Group ID is required' });

    const group = await Group.findOne({ groupId });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.members.includes(new mongoose.Types.ObjectId(req.user.id)))
      return res.status(400).json({ message: 'Already a member' });
    if (group.members.length >= group.maxSize)
      return res.status(400).json({ message: 'Group is full' });

    group.members.push(new mongoose.Types.ObjectId(req.user.id));
    await group.save();
    const updatedGroup = await Group.findOne({ groupId })
      .populate('members', 'name email')
      .populate('createdBy', 'name')
      .populate('admin', 'name');
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Failed to join group', error: error.message });
  }
});

router.post('/group-chat', async (req, res) => {
  const { groupId, message, userId, timestamp } = req.body;

  try {
    if (!groupId || !message || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!group.members.some((m) => m._id.equals(userObjectId))) {
      return res.status(403).json({ error: 'Not a member of the group' });
    }

    const newMessage = {
      userId: userObjectId,
      message,
      timestamp: new Date(timestamp || Date.now()),
    };
    group.chat.push(newMessage);
    await group.save();
    console.log('Message saved to database, group.chat:', group.chat);

    const io = req.app.get('io');
    io.to(groupId).emit('newMessage', { groupId, ...newMessage });

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Upload resource (file)
router.post('/upload-file', authenticate, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload file request received:', req.body, req.file);
    const { groupId } = req.body;
    if (!groupId || !req.file) {
      return res.status(400).json({ message: 'Group ID and file are required' });
    }

    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!group.members.includes(new mongoose.Types.ObjectId(req.user.id))) {
      return res.status(403).json({ message: 'Not a member' });
    }

    group.resources.push({
      filename: req.file.originalname,
      path: req.file.path,
      uploadedBy: req.user.id,
    });
    await group.save();
    const updatedGroup = await Group.findOne({ groupId })
      .populate('members', 'name email')
      .populate('createdBy', 'name')
      .populate('admin', 'name');
    res.json({ message: 'File uploaded', resources: updatedGroup.resources });
  } catch (err) {
    console.error('File upload error details:', {
      message: err.message,
      stack: err.stack,
      file: req.file,
      body: req.body,
    });
    res.status(500).json({ message: 'Failed to upload file', error: err.message });
  }
});
router.get('/:groupId', authenticate, async (req, res) => {
  try {
    const group = await Group.findOne({ groupId: req.params.groupId })
      .populate('members', 'name email _id')
      .populate('createdBy', 'name _id')
      .populate('admin', 'name _id');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const isMember = group.members.some(m => m._id.equals(userObjectId));
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member' });
    }

    res.json(group);
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ message: 'Failed to get group', error: err.message });
  }
});

module.exports = router;