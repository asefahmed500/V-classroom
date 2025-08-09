#!/usr/bin/env node

const { createServer } = require('http')
const { Server } = require('socket.io')

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.0.102:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Store room data and user connections
const rooms = new Map()
const userSockets = new Map()

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`)

  // Store user socket
  socket.on("register-user", (userId) => {
    userSockets.set(userId, socket.id)
    socket.userId = userId
  })

  // Room management
  socket.on("join-room", (roomId, userId, userName) => {
    try {
      socket.join(roomId)
      socket.roomId = roomId
      socket.userId = userId
      socket.userName = userName

      // Initialize room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          participants: new Map(),
          messages: [],
          whiteboardData: [],
          notes: [],
          timerState: null,
        })
      }

      const room = rooms.get(roomId)
      room.participants.set(userId, {
        id: userId,
        name: userName,
        socketId: socket.id,
        videoEnabled: true,
        audioEnabled: true,
        joinedAt: new Date(),
      })

      // Notify others about new participant
      socket.to(roomId).emit("user-joined", {
        id: userId,
        name: userName,
        videoEnabled: true,
        audioEnabled: true,
      })

      // Send current room state to new user
      socket.emit("room-state", {
        participants: Array.from(room.participants.values()),
        messages: room.messages.slice(-50), // Last 50 messages
        whiteboardData: room.whiteboardData,
        notes: room.notes,
        timerState: room.timerState,
      })

      console.log(`👥 User ${userName} (${userId}) joined room ${roomId}`)
    } catch (error) {
      console.error("Error joining room:", error)
      socket.emit("error", "Failed to join room")
    }
  })

  // Video chat signaling
  socket.on("webrtc-offer", (data) => {
    socket.to(data.roomId).emit("webrtc-offer", {
      offer: data.offer,
      from: socket.userId,
    })
  })

  socket.on("webrtc-answer", (data) => {
    socket.to(data.roomId).emit("webrtc-answer", {
      answer: data.answer,
      from: socket.userId,
    })
  })

  socket.on("webrtc-ice-candidate", (data) => {
    socket.to(data.roomId).emit("webrtc-ice-candidate", {
      candidate: data.candidate,
      from: socket.userId,
    })
  })

  // Chat messages
  socket.on("send-message", (data) => {
    try {
      const { roomId, content, type = "text" } = data
      const room = rooms.get(roomId)
      
      if (!room) {
        socket.emit("error", "Room not found")
        return
      }

      const message = {
        id: Date.now().toString(),
        userId: socket.userId,
        userName: socket.userName,
        content,
        type,
        timestamp: new Date().toISOString(),
      }

      // Store message
      room.messages.push(message)
      
      // Keep only last 100 messages
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100)
      }

      // Broadcast to all users in room
      io.to(roomId).emit("new-message", message)
    } catch (error) {
      console.error("Error sending message:", error)
      socket.emit("error", "Failed to send message")
    }
  })

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`)

    if (socket.roomId && socket.userId) {
      const room = rooms.get(socket.roomId)
      if (room) {
        room.participants.delete(socket.userId)
        
        // Notify others about user leaving
        socket.to(socket.roomId).emit("user-left", {
          userId: socket.userId,
          userName: socket.userName,
        })

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(socket.roomId)
          console.log(`🧹 Cleaned up empty room: ${socket.roomId}`)
        }
      }
    }

    // Remove from user sockets map
    if (socket.userId) {
      userSockets.delete(socket.userId)
    }
  })
})

const port = process.env.SOCKET_PORT || 3001
httpServer.listen(port, () => {
  console.log(`🚀 Socket.io server running on port ${port}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down Socket.io server...")
  io.close(() => {
    console.log("Socket.io server closed")
    httpServer.close(() => {
      console.log("HTTP server closed")
      process.exit(0)
    })
  })
})