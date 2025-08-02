// Global type definitions
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string
      JWT_SECRET: string
      GEMINI_API_KEY: string
      NEXT_PUBLIC_SITE_URL: string
      NODE_ENV: "development" | "production" | "test"
    }
  }

  interface Window {
    io: any
  }
}

// Socket.io types
export interface ServerToClientEvents {
  "user-connected": (userId: string) => void
  "user-disconnected": (userId: string) => void
  offer: (offer: RTCSessionDescriptionInit, userId: string) => void
  answer: (answer: RTCSessionDescriptionInit, userId: string) => void
  "ice-candidate": (candidate: RTCIceCandidateInit, userId: string) => void
  "chat-message": (message: any) => void
  "whiteboard-draw": (drawData: any) => void
  "whiteboard-clear": () => void
  "timer-start": (timerData: any) => void
  "timer-pause": () => void
  "timer-reset": () => void
  "file-shared": (fileData: any) => void
  "note-update": (noteData: any) => void
}

export interface ClientToServerEvents {
  "join-room": (roomId: string, userId: string) => void
  "leave-room": (roomId: string, userId: string) => void
  offer: (roomId: string, offer: RTCSessionDescriptionInit, userId: string) => void
  answer: (roomId: string, answer: RTCSessionDescriptionInit, userId: string) => void
  "ice-candidate": (roomId: string, candidate: RTCIceCandidateInit, userId: string) => void
  "chat-message": (roomId: string, message: any) => void
  "whiteboard-draw": (roomId: string, drawData: any) => void
  "whiteboard-clear": (roomId: string) => void
  "timer-start": (roomId: string, timerData: any) => void
  "timer-pause": (roomId: string) => void
  "timer-reset": (roomId: string) => void
  "file-shared": (roomId: string, fileData: any) => void
  "note-update": (roomId: string, noteData: any) => void
}
