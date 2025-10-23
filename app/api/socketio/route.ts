import { NextRequest } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'

export const dynamic = 'force-dynamic'

// Global variable to store the Socket.IO server instance
let io: ServerIO | undefined

// Store room data and user connections
const rooms = new Map()
const userSockets = new Map()

function initializeSocketIO(server: NetServer): ServerIO {
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
          messages: room.messages.slice(-50),
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

    // Google Meet style events
    socket.on("join-google-meet-room", (data) => {
      const { roomId, userId, userName, userEmail, isHost } = data
      try {
        socket.join(roomId)
        ;(socket as any).roomId = roomId
        ;(socket as any).userId = userId
        ;(socket as any).userName = userName

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
        const participant = {
          id: userId,
          name: userName,
          email: userEmail,
          socketId: socket.id,
          videoEnabled: true,
          audioEnabled: true,
          isScreenSharing: false,
          isSpeaking: false,
          isHandRaised: false,
          joinedAt: Date.now(),
          role: isHost ? 'host' : 'participant',
          connectionQuality: 'excellent'
        }

        room.participants.set(userId, participant)

        // Send room joined confirmation with all participants
        socket.emit("room-joined", {
          participants: Array.from(room.participants.values())
        })

        // Notify others about new participant
        socket.to(roomId).emit("participant-joined", participant)

        console.log(`👥 User ${userName} joined Google Meet room ${roomId}`)
      } catch (error) {
        console.error("Error joining Google Meet room:", error)
        socket.emit("error", "Failed to join room")
      }
    })

    // Media controls
    socket.on("update-media", (data) => {
      const { roomId, userId, type, enabled } = data
      const room = rooms.get(roomId)
      if (room && room.participants.has(userId)) {
        const participant = room.participants.get(userId)
        if (type === 'video') {
          participant.videoEnabled = enabled
        } else if (type === 'audio') {
          participant.audioEnabled = enabled
        }
        
        socket.to(roomId).emit("participant-updated", participant)
      }
    })

    socket.on("raise-hand", (data) => {
      const { roomId, userId, userName, raised } = data
      const room = rooms.get(roomId)
      if (room && room.participants.has(userId)) {
        const participant = room.participants.get(userId)
        participant.isHandRaised = raised
        
        socket.to(roomId).emit("participant-updated", participant)
        if (raised) {
          socket.to(roomId).emit("hand-raised", { participantId: userId, participantName: userName })
        }
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

        room.messages.push(message)
        
        if (room.messages.length > 100) {
          room.messages = room.messages.slice(-100)
        }

        io.to(roomId).emit("new-message", message)
      } catch (error) {
        console.error("Error sending message:", error)
        socket.emit("error", "Failed to send message")
      }
    })

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`)

      if ((socket as any).roomId && (socket as any).userId) {
        const room = rooms.get((socket as any).roomId)
        if (room) {
          room.participants.delete((socket as any).userId)
          
          socket.to((socket as any).roomId).emit("participant-left", (socket as any).userId)

          if (room.participants.size === 0) {
            rooms.delete((socket as any).roomId)
            console.log(`🧹 Cleaned up empty room: ${(socket as any).roomId}`)
          }
        }
      }

      if ((socket as any).userId) {
        userSockets.delete((socket as any).userId)
      }
    })

    socket.on("leave-room", (data) => {
      const { roomId, userId } = data
      try {
        socket.leave(roomId)
        
        const room = rooms.get(roomId)
        if (room && userId) {
          room.participants.delete(userId)
          socket.to(roomId).emit("participant-left", userId)
        }
      } catch (error) {
        console.error("Error leaving room:", error)
      }
    })
  })

  return io
}

export async function GET(request: NextRequest) {
  const res = new Response('Socket.IO server is running', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })

  // Initialize Socket.IO if not already done
  if (!io) {
    try {
      // For Next.js App Router, we need to access the server differently
      // This is a simplified approach - in production you'd want to use a custom server
      console.log('Socket.IO initialization attempted via API route')
    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error)
    }
  }

  return res
}

export async function POST(request: NextRequest) {
  return new Response('Socket.IO POST handler', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}