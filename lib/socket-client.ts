"use client"

import { io, type Socket } from "socket.io-client"

class SocketManager {
  private static instance: SocketManager
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }

  public connect(): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io({
      path: "/api/socketio",
      addTrailingSlash: false,
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      maxHttpBufferSize: 1e6,
      pingTimeout: 60000,
      pingInterval: 25000,
    })

    this.setupEventHandlers()
    return this.socket
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason)
      if (reason === "io server disconnect") {
        // Server initiated disconnect, reconnect manually
        this.socket?.connect()
      }
    })

    this.socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error)
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached")
        this.socket?.disconnect()
      }
    })

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts")
      this.reconnectAttempts = 0
    })

    this.socket.on("reconnect_error", (error) => {
      console.error("🔴 Socket reconnection error:", error)
    })

    this.socket.on("reconnect_failed", () => {
      console.error("🔴 Socket reconnection failed")
    })
  }

  public getSocket(): Socket | null {
    return this.socket
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // Room management methods
  public joinRoom(roomId: string, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("join-room", roomId, userId)
    }
  }

  public leaveRoom(roomId: string, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("leave-room", roomId, userId)
    }
  }

  // WebRTC signaling methods
  public sendOffer(roomId: string, offer: RTCSessionDescriptionInit, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("offer", roomId, offer, userId)
    }
  }

  public sendAnswer(roomId: string, answer: RTCSessionDescriptionInit, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("answer", roomId, answer, userId)
    }
  }

  public sendIceCandidate(roomId: string, candidate: RTCIceCandidateInit, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("ice-candidate", roomId, candidate, userId)
    }
  }

  // Chat methods
  public sendChatMessage(roomId: string, message: any): void {
    if (this.socket?.connected) {
      this.socket.emit("chat-message", roomId, message)
    }
  }

  // Whiteboard methods
  public sendWhiteboardDraw(roomId: string, drawData: any): void {
    if (this.socket?.connected) {
      this.socket.emit("whiteboard-draw", roomId, drawData)
    }
  }

  public sendWhiteboardClear(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("whiteboard-clear", roomId)
    }
  }

  // Timer methods
  public sendTimerStart(roomId: string, timerData: any): void {
    if (this.socket?.connected) {
      this.socket.emit("timer-start", roomId, timerData)
    }
  }

  public sendTimerPause(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("timer-pause", roomId)
    }
  }

  public sendTimerReset(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("timer-reset", roomId)
    }
  }

  // File sharing methods
  public sendFileShared(roomId: string, fileData: any): void {
    if (this.socket?.connected) {
      this.socket.emit("file-shared", roomId, fileData)
    }
  }

  // Notes methods
  public sendNoteUpdate(roomId: string, noteData: any): void {
    if (this.socket?.connected) {
      this.socket.emit("note-update", roomId, noteData)
    }
  }
}

export const socketManager = SocketManager.getInstance()
export const getSocket = () => socketManager.getSocket()
export const connectSocket = () => socketManager.connect()
export const disconnectSocket = () => socketManager.disconnect()
export const isSocketConnected = () => socketManager.isConnected()
