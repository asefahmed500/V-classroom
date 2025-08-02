import type { NextRequest } from "next/server"
import { Server } from "socket.io"
import { createServer } from "http"

let io: Server
let httpServer: any

export async function GET(req: NextRequest) {
  if (!io) {
    try {
      httpServer = createServer()

      io = new Server(httpServer, {
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

      // Store room data and user connections
      const rooms = new Map()
      const userSockets = new Map()

      io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.id}`)

        // Store user socket
        socket.on("register-user", (userId: string) => {
          userSockets.set(userId, socket.id)
          socket.userId = userId
        })

        // Room management
        socket.on("join-room", (roomId: string, userId: string, userName: string) => {
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

        // Media controls
        socket.on("toggle-video", (roomId: string, enabled: boolean) => {
          const room = rooms.get(roomId)
          if (room && room.participants.has(socket.userId)) {
            const participant = room.participants.get(socket.userId)
            participant.videoEnabled = enabled
            socket.to(roomId).emit("user-video-toggle", {
              userId: socket.userId,
              enabled,
            })
          }
        })

        socket.on("toggle-audio", (roomId: string, enabled: boolean) => {
          const room = rooms.get(roomId)
          if (room && room.participants.has(socket.userId)) {
            const participant = room.participants.get(socket.userId)
            participant.audioEnabled = enabled
            socket.to(roomId).emit("user-audio-toggle", {
              userId: socket.userId,
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

        // Typing indicators
        socket.on("typing-start", (roomId: string) => {
          socket.to(roomId).emit("user-typing", {
            userId: socket.userId,
            userName: socket.userName,
          })
        })

        socket.on("typing-stop", (roomId: string) => {
          socket.to(roomId).emit("user-stopped-typing", {
            userId: socket.userId,
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
              userId: socket.userId,
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

        // Collaborative notes
        socket.on("note-create", (data) => {
          try {
            const { roomId, title, content } = data
            const room = rooms.get(roomId)
            
            if (!room) {
              socket.emit("error", "Room not found")
              return
            }

            const note = {
              id: Date.now().toString(),
              title,
              content,
              createdBy: socket.userId,
              createdByName: socket.userName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            room.notes.push(note)
            io.to(roomId).emit("note-created", note)
          } catch (error) {
            console.error("Error creating note:", error)
          }
        })

        socket.on("note-update", (data) => {
          try {
            const { roomId, noteId, title, content } = data
            const room = rooms.get(roomId)
            
            if (!room) {
              socket.emit("error", "Room not found")
              return
            }

            const noteIndex = room.notes.findIndex(n => n.id === noteId)
            if (noteIndex !== -1) {
              room.notes[noteIndex] = {
                ...room.notes[noteIndex],
                title,
                content,
                updatedAt: new Date().toISOString(),
              }
              
              io.to(roomId).emit("note-updated", room.notes[noteIndex])
            }
          } catch (error) {
            console.error("Error updating note:", error)
          }
        })

        // Timer synchronization
        socket.on("timer-start", (data) => {
          try {
            const { roomId, duration, type } = data
            const room = rooms.get(roomId)
            
            if (!room) {
              socket.emit("error", "Room not found")
              return
            }

            const timerState = {
              isRunning: true,
              duration,
              type,
              startTime: Date.now(),
              pausedTime: 0,
            }

            room.timerState = timerState
            io.to(roomId).emit("timer-started", timerState)
          } catch (error) {
            console.error("Error starting timer:", error)
          }
        })

        socket.on("timer-pause", (roomId: string) => {
          const room = rooms.get(roomId)
          if (room && room.timerState) {
            room.timerState.isRunning = false
            room.timerState.pausedTime = Date.now()
            io.to(roomId).emit("timer-paused", room.timerState)
          }
        })

        socket.on("timer-resume", (roomId: string) => {
          const room = rooms.get(roomId)
          if (room && room.timerState) {
            const pauseDuration = Date.now() - room.timerState.pausedTime
            room.timerState.startTime += pauseDuration
            room.timerState.isRunning = true
            io.to(roomId).emit("timer-resumed", room.timerState)
          }
        })

        socket.on("timer-reset", (roomId: string) => {
          const room = rooms.get(roomId)
          if (room) {
            room.timerState = null
            io.to(roomId).emit("timer-reset")
          }
        })

        // File sharing
        socket.on("file-shared", (data) => {
          try {
            const { roomId, fileData } = data
            const fileInfo = {
              ...fileData,
              sharedBy: socket.userId,
              sharedByName: socket.userName,
              sharedAt: new Date().toISOString(),
            }

            socket.to(roomId).emit("file-shared", fileInfo)
          } catch (error) {
            console.error("Error sharing file:", error)
          }
        })

        // Screen sharing
        socket.on("screen-share-start", (roomId: string) => {
          socket.to(roomId).emit("user-screen-share-start", {
            userId: socket.userId,
            userName: socket.userName,
          })
        })

        socket.on("screen-share-stop", (roomId: string) => {
          socket.to(roomId).emit("user-screen-share-stop", {
            userId: socket.userId,
          })
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

        socket.on("leave-room", (roomId: string) => {
          try {
            socket.leave(roomId)
            
            const room = rooms.get(roomId)
            if (room && socket.userId) {
              room.participants.delete(socket.userId)
              
              socket.to(roomId).emit("user-left", {
                userId: socket.userId,
                userName: socket.userName,
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

      // Start server
      const port = process.env.SOCKET_PORT || 3001
      httpServer.listen(port, () => {
        console.log(`🚀 Socket.io server running on port ${port}`)
      })

    } catch (error) {
      console.error("Failed to initialize Socket.io server:", error)
      return new Response("Failed to initialize Socket.io server", { status: 500 })
    }
  }

  return new Response("Socket.io server running", { status: 200 })
}

export { GET as POST }

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down Socket.io server...")
  if (io) {
    io.close(() => {
      console.log("Socket.io server closed")
      if (httpServer) {
        httpServer.close(() => {
          console.log("HTTP server closed")
          process.exit(0)
        })
      }
    })
  }
})