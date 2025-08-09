const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

let io;
let db;

// Initialize MongoDB connection
const connectToDatabase = async () => {
  if (db) return db;
  
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-study-rooms');
  await client.connect();
  db = client.db('virtual-study-rooms');
  return db;
};

const initializeSocket = async (server) => {
  // Connect to database
  await connectToDatabase();
  
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
      methods: ['GET', 'POST']
    }
  });

  // Store active connections
  const userSockets = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      try {
        socket.join(roomId.toUpperCase());
        userSockets.set(userId, socket.id);

        // Update room in database
        const room = await db.collection('rooms').findOneAndUpdate(
          { roomId: roomId.toUpperCase(), isActive: true },
          {
            $addToSet: {
              participants: {
                userId,
                userName,
                joinedAt: new Date(),
                isHost: false,
                video: true,
                audio: true,
                socketId: socket.id
              }
            },
            $set: { lastActivity: new Date() }
          },
          { returnDocument: 'after', upsert: false }
        );

        if (room.value) {
          // Set first participant as host
          if (room.value.participants.length === 1) {
            await db.collection('rooms').updateOne(
              { roomId: roomId.toUpperCase(), 'participants.userId': userId },
              { $set: { 'participants.$.isHost': true } }
            );
          }

          // Get updated room data
          const updatedRoom = await db.collection('rooms').findOne({ roomId: roomId.toUpperCase() });

          // Notify others in the room
          socket.to(roomId.toUpperCase()).emit('user-joined', {
            userId,
            userName,
            participants: updatedRoom.participants
          });

          // Send current room state to new user
          socket.emit('room-state', {
            participants: updatedRoom.participants,
            whiteboardData: updatedRoom.whiteboardData || [],
            timer: updatedRoom.timerState || { isRunning: false, timeLeft: 1500, mode: 'work', session: 1 }
          });

          console.log(`User ${userName} joined room ${roomId.toUpperCase()}`);
        }
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // WebRTC signaling
    socket.on('offer', ({ offer, to, from }) => {
      const targetSocket = userSockets.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('offer', { offer, from });
      }
    });

    socket.on('answer', ({ answer, to, from }) => {
      const targetSocket = userSockets.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('answer', { answer, from });
      }
    });

    socket.on('ice-candidate', ({ candidate, to, from }) => {
      const targetSocket = userSockets.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('ice-candidate', { candidate, from });
      }
    });

    // Media controls
    socket.on('toggle-video', async ({ roomId, userId, video }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase(), 'participants.userId': userId },
          { 
            $set: { 
              'participants.$.video': video,
              lastActivity: new Date()
            }
          }
        );
        
        socket.to(roomId.toUpperCase()).emit('user-media-changed', { userId, video });
      } catch (error) {
        console.error('Toggle video error:', error);
      }
    });

    socket.on('toggle-audio', async ({ roomId, userId, audio }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase(), 'participants.userId': userId },
          { 
            $set: { 
              'participants.$.audio': audio,
              lastActivity: new Date()
            }
          }
        );
        
        socket.to(roomId.toUpperCase()).emit('user-media-changed', { userId, audio });
      } catch (error) {
        console.error('Toggle audio error:', error);
      }
    });

    // Whiteboard events
    socket.on('whiteboard-draw', async ({ roomId, drawData }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase() },
          { 
            $push: { whiteboardData: drawData },
            $set: { lastActivity: new Date() }
          }
        );
        
        socket.to(roomId.toUpperCase()).emit('whiteboard-draw', drawData);
      } catch (error) {
        console.error('Whiteboard draw error:', error);
      }
    });

    socket.on('whiteboard-clear', async ({ roomId }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase() },
          { 
            $set: { 
              whiteboardData: [],
              lastActivity: new Date()
            }
          }
        );
        
        socket.to(roomId.toUpperCase()).emit('whiteboard-clear');
      } catch (error) {
        console.error('Whiteboard clear error:', error);
      }
    });

    // Chat messages
    socket.on('chat-message', async ({ roomId, message, userId, userName, type, fileData, replyTo }) => {
      try {
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const messageData = {
          messageId,
          roomId: roomId.toUpperCase(),
          userId,
          userName,
          message,
          type: type || 'text',
          fileData: fileData || null,
          replyTo: replyTo || null,
          reactions: [],
          createdAt: new Date(),
          isDeleted: false
        };

        await db.collection('messages').insertOne(messageData);
        
        // Broadcast to room
        io.to(roomId.toUpperCase()).emit('chat-message', messageData);
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Message reactions
    socket.on('message-reaction', async ({ roomId, messageId, emoji, userId }) => {
      try {
        const message = await db.collection('messages').findOne({ messageId });
        if (!message) return;

        const existingReaction = message.reactions?.find(r => r.emoji === emoji && r.userId === userId);
        
        if (existingReaction) {
          // Remove reaction
          await db.collection('messages').updateOne(
            { messageId },
            { $pull: { reactions: { emoji, userId } } }
          );
        } else {
          // Add reaction
          await db.collection('messages').updateOne(
            { messageId },
            { $addToSet: { reactions: { emoji, userId, createdAt: new Date() } } }
          );
        }
        
        io.to(roomId.toUpperCase()).emit('message-reaction', { messageId, emoji, userId });
      } catch (error) {
        console.error('Message reaction error:', error);
      }
    });

    // Notes collaboration
    socket.on('notes-update', async ({ roomId, notes, userId, userName }) => {
      try {
        await db.collection('notes').updateOne(
          { roomId: roomId.toUpperCase() },
          {
            $set: {
              content: notes,
              lastModifiedBy: userId,
              lastModifiedAt: new Date()
            },
            $setOnInsert: {
              roomId: roomId.toUpperCase(),
              createdAt: new Date(),
              version: 1
            },
            $addToSet: {
              collaborators: {
                userId,
                userName: userName || 'Anonymous',
                lastActive: new Date()
              }
            }
          },
          { upsert: true }
        );
        
        socket.to(roomId.toUpperCase()).emit('notes-update', notes);
      } catch (error) {
        console.error('Notes update error:', error);
      }
    });

    // Cursor position for notes
    socket.on('cursor-position', ({ roomId, userId, userName, position }) => {
      socket.to(roomId.toUpperCase()).emit('cursor-position', { userId, userName, position });
    });

    // Typing indicators
    socket.on('user-typing', ({ roomId, userId, userName, isTyping }) => {
      socket.to(roomId.toUpperCase()).emit('user-typing', { userId, userName, isTyping });
    });

    // File sharing
    socket.on('file-shared', ({ roomId, fileData }) => {
      socket.to(roomId.toUpperCase()).emit('file-shared', fileData);
    });

    socket.on('file-deleted', ({ roomId, fileId }) => {
      socket.to(roomId.toUpperCase()).emit('file-deleted', { fileId });
    });

    // Study timer
    socket.on('timer-start', async ({ roomId }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase() },
          { 
            $set: { 
              'timerState.isRunning': true,
              lastActivity: new Date()
            }
          }
        );
        
        const room = await db.collection('rooms').findOne({ roomId: roomId.toUpperCase() });
        io.to(roomId.toUpperCase()).emit('timer-start', room.timerState);
      } catch (error) {
        console.error('Timer start error:', error);
      }
    });

    socket.on('timer-pause', async ({ roomId }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase() },
          { 
            $set: { 
              'timerState.isRunning': false,
              lastActivity: new Date()
            }
          }
        );
        
        const room = await db.collection('rooms').findOne({ roomId: roomId.toUpperCase() });
        io.to(roomId.toUpperCase()).emit('timer-pause', room.timerState);
      } catch (error) {
        console.error('Timer pause error:', error);
      }
    });

    socket.on('timer-reset', async ({ roomId }) => {
      try {
        const newTimerState = { isRunning: false, timeLeft: 1500, mode: 'work', session: 1 };
        
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase() },
          { 
            $set: { 
              timerState: newTimerState,
              lastActivity: new Date()
            }
          }
        );
        
        io.to(roomId.toUpperCase()).emit('timer-reset', newTimerState);
      } catch (error) {
        console.error('Timer reset error:', error);
      }
    });

    socket.on('timer-update', async ({ roomId, timeLeft, mode }) => {
      try {
        await db.collection('rooms').updateOne(
          { roomId: roomId.toUpperCase() },
          { 
            $set: { 
              'timerState.timeLeft': timeLeft,
              'timerState.mode': mode,
              lastActivity: new Date()
            }
          }
        );
        
        socket.to(roomId.toUpperCase()).emit('timer-update', { timeLeft, mode });
      } catch (error) {
        console.error('Timer update error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      try {
        // Find user by socket ID and remove from all rooms
        const rooms = await db.collection('rooms').find({
          'participants.socketId': socket.id,
          isActive: true
        }).toArray();

        for (const room of rooms) {
          const participant = room.participants.find(p => p.socketId === socket.id);
          if (participant) {
            // Remove participant from room
            await db.collection('rooms').updateOne(
              { roomId: room.roomId },
              { 
                $pull: { participants: { socketId: socket.id } },
                $set: { lastActivity: new Date() }
              }
            );

            userSockets.delete(participant.userId);

            // Get updated participants list
            const updatedRoom = await db.collection('rooms').findOne({ roomId: room.roomId });
            
            // Notify others in the room
            socket.to(room.roomId).emit('user-left', {
              userId: participant.userId,
              participants: updatedRoom.participants
            });

            // Deactivate room if empty
            if (updatedRoom.participants.length === 0) {
              await db.collection('rooms').updateOne(
                { roomId: room.roomId },
                { $set: { isActive: false, endedAt: new Date() } }
              );
            }
          }
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initializeSocket, getIO };