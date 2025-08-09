import { Server as NetServer } from "http"
import { NextApiRequest, NextApiResponse } from "next"
import { Server as ServerIO } from "socket.io"

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO
    }
  }
}

// Store room data and user connections
const rooms = new Map()
const userSockets = new Map()

export const initializeSocketIO = (server: NetServer) => {
  const io = new ServerIO(server, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
  })

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`)

    // Store user socket
    socket.on("register-user", (userId: string) => {
      userSockets.set(userId, socket.id)
      ;(socket as any).userId = userId
    })

    // Room management
    socket.on("join-room", (roomId: string, userId: string, userName: string) => {
      try {
        socket.join(roomId)
        ;(socket as any).roomId = roomId
        ;(socket as any).userId = userId
        ;(socket as any).userName = userName

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
        from: (socket as any).userId,
      })
    })

    socket.on("webrtc-answer", (data) => {
      socket.to(data.roomId).emit("webrtc-answer", {
        answer: data.answer,
        from: (socket as any).userId,
      })
    })

    socket.on("webrtc-ice-candidate", (data) => {
      socket.to(data.roomId).emit("webrtc-ice-candidate", {
        candidate: data.candidate,
        from: (socket as any).userId,
      })
    })

    // Media controls
    socket.on("toggle-video", (roomId: string, enabled: boolean) => {
      const room = rooms.get(roomId)
      if (room && room.participants.has((socket as any).userId)) {
        const participant = room.participants.get((socket as any).userId)
        participant.videoEnabled = enabled
        socket.to(roomId).emit("user-video-toggle", {
          userId: (socket as any).userId,
          enabled,
        })
      }
    })

    socket.on("toggle-audio", (roomId: string, enabled: boolean) => {
      const room = rooms.get(roomId)
      if (room && room.participants.has((socket as any).userId)) {
        const participant = room.participants.get((socket as any).userId)
        participant.audioEnabled = enabled
        socket.to(roomId).emit("user-audio-toggle", {
          userId: (socket as any).userId,
          enabled,
        })
      }
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
          userId: (socket as any).userId,
          userName: (socket as any).userName,
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

    // Typing indicators
    socket.on("typing-start", (roomId: string) => {
      socket.to(roomId).emit("user-typing", {
        userId: (socket as any).userId,
        userName: (socket as any).userName,
      })
    })

    socket.on("typing-stop", (roomId: string) => {
      socket.to(roomId).emit("user-stopped-typing", {
        userId: (socket as any).userId,
      })
    })

    // Whiteboard collaboration
    socket.on("whiteboard-draw", (data) => {
      try {
        const { roomId, drawData } = data
        const room = rooms.get(roomId)
        
        if (!room) {
          socket.emit("error", "Room not found")
          return
        }

        // Store drawing data
        room.whiteboardData.push({
          ...drawData,
          userId: (socket as any).userId,
          timestamp: Date.now(),
        })

        // Broadcast to others
        socket.to(roomId).emit("whiteboard-update", drawData)
      } catch (error) {
        console.error("Error updating whiteboard:", error)
      }
    })

    socket.on("whiteboard-clear", (roomId: string) => {
      const room = rooms.get(roomId)
      if (room) {
        room.whiteboardData = []
        io.to(roomId).emit("whiteboard-cleared")
      }
    })

    // Screen sharing
    socket.on("screen-share-start", (roomId: string) => {
      socket.to(roomId).emit("user-screen-share-start", {
        userId: (socket as any).userId,
        userName: (socket as any).userName,
      })
    })

    socket.on("screen-share-stop", (roomId: string) => {
      socket.to(roomId).emit("user-screen-share-stop", {
        userId: (socket as any).userId,
      })
    })

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`)

      if ((socket as any).roomId && (socket as any).userId) {
        const room = rooms.get((socket as any).roomId)
        if (room) {
          room.participants.delete((socket as any).userId)
          
          // Notify others about user leaving
          socket.to((socket as any).roomId).emit("user-left", {
            userId: (socket as any).userId,
            userName: (socket as any).userName,
          })

          // Clean up empty rooms
          if (room.participants.size === 0) {
            rooms.delete((socket as any).roomId)
            console.log(`🧹 Cleaned up empty room: ${(socket as any).roomId}`)
          }
        }
      }

      // Remove from user sockets map
      if ((socket as any).userId) {
        userSockets.delete((socket as any).userId)
      }
    })

    socket.on("leave-room", (roomId: string) => {
      try {
        socket.leave(roomId)
        
        const room = rooms.get(roomId)
        if (room && (socket as any).userId) {
          room.participants.delete((socket as any).userId)
          
          socket.to(roomId).emit("user-left", {
            userId: (socket as any).userId,
            userName: (socket as any).userName,
          })
        }
      } catch (error) {
        console.error("Error leaving room:", error)
      }
    })

    // Error handling
    socket.on("error", (error) => {
      console.error(`🔴 Socket error for ${socket.id}:`, error)
    })
  })

  return io
}