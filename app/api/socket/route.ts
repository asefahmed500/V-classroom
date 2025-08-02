import { type NextRequest, NextResponse } from "next/server"
import { Server } from "socket.io"
import { createServer } from "http"

let io: Server | undefined

export async function GET(req: NextRequest) {
  if (!io) {
    try {
      const httpServer = createServer()
      io = new Server(httpServer, {
        path: "/api/socket",
        cors: {
          origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
        },
      })

      io.on("connection", (socket) => {
        console.log("User connected:", socket.id)

        // Join room
        socket.on("join-room", (roomId: string, userId: string) => {
          socket.join(roomId)
          socket.to(roomId).emit("user-connected", userId)
          console.log(`User ${userId} joined room ${roomId}`)
        })

        // WebRTC signaling
        socket.on("offer", (roomId: string, offer: RTCSessionDescriptionInit, userId: string) => {
          socket.to(roomId).emit("offer", offer, userId)
        })

        socket.on("answer", (roomId: string, answer: RTCSessionDescriptionInit, userId: string) => {
          socket.to(roomId).emit("answer", answer, userId)
        })

        socket.on("ice-candidate", (roomId: string, candidate: RTCIceCandidateInit, userId: string) => {
          socket.to(roomId).emit("ice-candidate", candidate, userId)
        })

        // Chat messages
        socket.on("chat-message", (roomId: string, message: any) => {
          io?.to(roomId).emit("chat-message", message)
        })

        // Whiteboard collaboration
        socket.on("whiteboard-draw", (roomId: string, drawData: any) => {
          socket.to(roomId).emit("whiteboard-draw", drawData)
        })

        socket.on("whiteboard-clear", (roomId: string) => {
          io?.to(roomId).emit("whiteboard-clear")
        })

        // Timer synchronization
        socket.on("timer-start", (roomId: string, timerData: any) => {
          io?.to(roomId).emit("timer-start", timerData)
        })

        socket.on("timer-pause", (roomId: string) => {
          io?.to(roomId).emit("timer-pause")
        })

        socket.on("timer-reset", (roomId: string) => {
          io?.to(roomId).emit("timer-reset")
        })

        // Screen sharing
        socket.on("screen-share-start", (roomId: string, userId: string) => {
          socket.to(roomId).emit("screen-share-start", userId)
        })

        socket.on("screen-share-stop", (roomId: string, userId: string) => {
          socket.to(roomId).emit("screen-share-stop", userId)
        })

        // File sharing
        socket.on("file-shared", (roomId: string, fileData: any) => {
          socket.to(roomId).emit("file-shared", fileData)
        })

        // Collaborative notes
        socket.on("note-update", (roomId: string, noteData: any) => {
          socket.to(roomId).emit("note-update", noteData)
        })

        // Disconnect
        socket.on("disconnect", () => {
          console.log("User disconnected:", socket.id)
        })

        socket.on("leave-room", (roomId: string, userId: string) => {
          socket.leave(roomId)
          socket.to(roomId).emit("user-disconnected", userId)
        })
      })

      httpServer.listen(3001, () => {
        console.log("Socket.io server running on port 3001")
      })
    } catch (error) {
      console.error("Socket.io initialization error:", error)
    }
  }

  return NextResponse.json({ message: "Socket.io server running" })
}

export { GET as POST }
