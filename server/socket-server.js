const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map(); // roomId -> Map of userId -> userData

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    
    const roomUsers = rooms.get(roomId);
    roomUsers.set(userId, { 
      socketId: socket.id, 
      userName: userName || 'Anonymous',
      joinedAt: new Date().toISOString()
    });
    
    // Notify others in the room
    socket.to(roomId).emit('user-connected', { userId, userName: userName || 'Anonymous' });
    
    // Send current users in room
    const usersInRoom = Array.from(roomUsers.entries()).map(([id, data]) => ({
      userId: id,
      userName: data.userName,
      joinedAt: data.joinedAt
    }));
    socket.emit('room-users', usersInRoom);
    
    console.log(`User ${userName} (${userId}) joined room ${roomId}`);
  });

  // WebRTC signaling
  socket.on('offer', (offer, roomId) => {
    socket.to(roomId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, roomId) => {
    socket.to(roomId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, roomId) => {
    socket.to(roomId).emit('ice-candidate', candidate, socket.id);
  });

  // Chat messages
  socket.on('chat-message', (message, roomId, userId, userName) => {
    io.to(roomId).emit('chat-message', {
      message,
      userId,
      userName: userName || 'Anonymous',
      timestamp: new Date().toISOString()
    });
  });

  // Screen sharing
  socket.on('start-screen-share', (roomId, userId) => {
    socket.to(roomId).emit('user-started-screen-share', userId);
  });

  socket.on('stop-screen-share', (roomId, userId) => {
    socket.to(roomId).emit('user-stopped-screen-share', userId);
  });

  // Leave room
  socket.on('leave-room', (roomId, userId) => {
    socket.leave(roomId);
    
    if (rooms.has(roomId)) {
      const roomUsers = rooms.get(roomId);
      const userData = roomUsers.get(userId);
      roomUsers.delete(userId);
      
      if (roomUsers.size === 0) {
        rooms.delete(roomId);
      }
      
      socket.to(roomId).emit('user-disconnected', { 
        userId, 
        userName: userData?.userName || 'Anonymous' 
      });
    }
    
    console.log(`User ${userId} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up user from all rooms
    for (const [roomId, roomUsers] of rooms.entries()) {
      for (const [userId, userData] of roomUsers.entries()) {
        if (userData.socketId === socket.id) {
          roomUsers.delete(userId);
          socket.to(roomId).emit('user-disconnected', { 
            userId, 
            userName: userData.userName 
          });
          
          if (roomUsers.size === 0) {
            rooms.delete(roomId);
          }
          break;
        }
      }
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});