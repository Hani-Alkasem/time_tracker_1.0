const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Make io accessible in routes
app.set('io', io);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const timeRoutes = require('./routes/timeRoutes');
app.use('/api/time', timeRoutes); // ✅ this must be correct


const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
