import { io, Socket } from 'socket.io-client'

class SocketManager {
  private static instance: SocketManager
  private socket: Socket | null = null
  private connectionPromise: Promise<Socket> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }

  async getSocket(): Promise<Socket> {
    // Always return existing connected socket if available
    if (this.socket && this.socket.connected) {
      console.log('🔄 Reusing existing socket connection:', this.socket.id)
      return this.socket
    }

    // If socket exists but disconnected, try to reconnect
    if (this.socket && !this.socket.connected) {
      console.log('🔄 Reconnecting existing socket...')
      this.socket.connect()
      return this.socket
    }

    // Create new connection if none exists
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this.createConnection()
    return this.connectionPromise
  }

  private createConnection(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000'

      console.log('🔌 Connecting to socket server:', socketUrl)

      const socket = io(socketUrl, {
        path: '/socket.io/',
        // For Vercel, prioritize polling over websocket to avoid connection issues
        transports: process.env.NODE_ENV === 'production' 
          ? ['polling', 'websocket'] 
          : ['polling', 'websocket'],
        timeout: 30000,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        maxReconnectionAttempts: 15,
        forceNew: false,
        upgrade: process.env.NODE_ENV === 'production' ? false : true, // Disable upgrade on production
        rememberUpgrade: false, // Don't remember upgrade on production
        autoConnect: true,
        // Additional options for better Vercel compatibility
        closeOnBeforeunload: false,
        withCredentials: true
      })

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id, 'Transport:', socket.io.engine.transport.name)
        this.socket = socket
        this.reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        this.connectionPromise = null // Clear connection promise
        resolve(socket)
      })

      socket.on('connection-confirmed', (data) => {
        console.log('✅ Connection confirmed:', data)
      })

      socket.on('transport-upgraded', (data) => {
        console.log('🚀 Transport upgraded to:', data.transport)
      })

      socket.on('heartbeat', (data) => {
        console.log('💓 Heartbeat received:', data.timestamp)
      })

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        this.reconnectAttempts++
        
        // If we're on production and getting WebSocket errors, force polling
        if (process.env.NODE_ENV === 'production' && this.reconnectAttempts < 3) {
          console.log('🔄 Retrying with polling transport only...')
          socket.io.opts.transports = ['polling']
          socket.io.opts.upgrade = false
          setTimeout(() => socket.connect(), 2000)
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error)
        }
      })

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          console.log('🔄 Server disconnected, attempting reconnection...')
          socket.connect()
        }
      })

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
      })

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt', attemptNumber)
      })

      socket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection failed:', error)
      })

      socket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed permanently')
        this.connectionPromise = null
        this.socket = null
        this.reconnectAttempts = 0
      })

      // Extended timeout for production
      const timeoutDuration = process.env.NODE_ENV === 'production' ? 30000 : 15000
      setTimeout(() => {
        if (!socket.connected) {
          console.error('❌ Connection timeout after', timeoutDuration, 'ms')
          reject(new Error(`Connection timeout after ${timeoutDuration}ms`))
        }
      }, timeoutDuration)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.connectionPromise = null
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Add connection health check
  async healthCheck(): Promise<boolean> {
    if (!this.socket || !this.socket.connected) {
      return false
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000)
      
      this.socket.emit('ping', { timestamp: Date.now() })
      this.socket.once('pong', () => {
        clearTimeout(timeout)
        resolve(true)
      })
    })
  }

  // Force reconnection
  async forceReconnect(): Promise<Socket> {
    console.log('🔄 Forcing socket reconnection...')
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.connectionPromise = null
    return this.getSocket()
  }
}

export const socketManager = SocketManager.getInstance()