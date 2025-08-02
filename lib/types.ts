import type { NextRequest } from "next/server"

export interface AuthenticatedRequest extends NextRequest {
  userId?: string
}

export interface SocketEvents {
  // WebRTC Events
  "join-room": (roomId: string, userId: string) => void
  "leave-room": (roomId: string, userId: string) => void
  "user-connected": (userId: string) => void
  "user-disconnected": (userId: string) => void
  offer: (roomId: string, offer: RTCSessionDescriptionInit, userId: string) => void
  answer: (roomId: string, answer: RTCSessionDescriptionInit, userId: string) => void
  "ice-candidate": (roomId: string, candidate: RTCIceCandidateInit, userId: string) => void

  // Chat Events
  "chat-message": (roomId: string, message: any) => void

  // Whiteboard Events
  "whiteboard-draw": (roomId: string, drawData: any) => void
  "whiteboard-clear": (roomId: string) => void

  // Timer Events
  "timer-start": (roomId: string, timerData: any) => void
  "timer-pause": (roomId: string) => void
  "timer-reset": (roomId: string) => void

  // File Events
  "file-shared": (roomId: string, fileData: any) => void

  // Note Events
  "note-update": (roomId: string, noteData: any) => void
}
