// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/adminAuth'));
app.use('/api/admin/courses', require('./routes/adminCourses'));
app.use('/api/user/courses', require('./routes/userCourses'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/group', require('./routes/groups'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust to 'http://localhost:3000' or your frontend URL in production
    methods: ['GET', 'POST']
  }
});

app.set('io', io); // Make io accessible in routes

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
  });

  socket.on('sendMessage', async (data, callback) => {
    console.log('Warning: sendMessage event received but not handled here; use POST /group/group-chat instead');
    if (callback) callback({ error: 'Use POST /group/group-chat instead' });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server started on port ${PORT} with Socket.IO`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });