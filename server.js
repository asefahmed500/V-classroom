const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      
      // Let Socket.IO handle its own requests
      if (req.url.startsWith('/socket.io/')) {
        return
      }
      
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Create Socket.IO server with Vercel-optimized configuration
  const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [
            "https://virtual-study-rooms.vercel.app",
            "https://virtual-study-rooms-git-main-your-username.vercel.app",
            /^https:\/\/virtual-study-rooms-.*\.vercel\.app$/
          ]
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    // Optimize transports for Vercel - prioritize polling
    transports: process.env.NODE_ENV === 'production' 
      ? ['polling'] // Only use polling on production to avoid WebSocket issues
      : ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 120000, // Increased for serverless
    pingInterval: 30000,  // Increased interval
    upgradeTimeout: 60000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 60000,
    // Additional Vercel-specific options
    allowUpgrades: process.env.NODE_ENV !== 'production', // Disable upgrades on production
    perMessageDeflate: false, // Disable compression for better performance
    httpCompression: false
  })

  // Store room data and participants
  const rooms = new Map()
  const roomMessages = new Map()

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'Transport:', socket.conn.transport.name)
    
    // Send connection confirmation immediately
    socket.emit('connection-confirmed', { 
      socketId: socket.id,
      transport: socket.conn.transport.name,
      timestamp: new Date().toISOString()
    })
    
    // Monitor transport upgrades
    socket.conn.on('upgrade', () => {
      console.log('Transport upgraded to:', socket.conn.transport.name)
      socket.emit('transport-upgraded', { transport: socket.conn.transport.name })
    })
    
    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      socket.emit('connection-error', { error: error.message })
    })
    
    // Handle ping/pong for connection health
    socket.on('ping', (data) => {
      socket.emit('pong', { timestamp: data.timestamp, serverTime: Date.now() })
    })

    // Send periodic heartbeat and room sync
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: new Date().toISOString() })
        
        // Send room state updates for all rooms this socket is in
        for (const [roomId, roomParticipants] of rooms) {
          if (roomParticipants.has(socket.id)) {
            const participants = Array.from(roomParticipants.values())
            socket.emit('room-state', { 
              participants,
              roomId,
              timestamp: new Date().toISOString()
            })
          }
        }
      } else {
        clearInterval(heartbeat)
      }
    }, 20000) // Increased to 20 seconds for better Vercel compatibility

    // Join room - updated to handle object parameter
    socket.on('join-room', async (data) => {
      // Handle both object and individual parameters for backward compatibility
      let roomId, userId, userName
      
      if (typeof data === 'object' && data !== null) {
        ({ roomId, userId, userName } = data)
      } else if (arguments.length >= 3) {
        [roomId, userId, userName] = arguments
      }
      
      console.log(`Join room request: ${userName} (${userId}) -> ${roomId}`)
      
      // Validate required parameters
      if (!roomId || !userId || !userName) {
        console.error('❌ Invalid join-room data:', { roomId, userId, userName })
        socket.emit('room-join-error', { 
          error: 'Missing required data: roomId, userId, and userName are required',
          data: { roomId, userId, userName }
        })
        return
      }
      
      // Sanitize roomId - ensure it's a string and trim whitespace
      roomId = String(roomId).trim()
      userId = String(userId).trim()
      userName = String(userName).trim()
      
      if (roomId && userId && userName) {
        try {
          // Join the socket room
          await socket.join(roomId)
          console.log(`Socket ${socket.id} joined room ${roomId}`)
          
          // Initialize room if it doesn't exist
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map())
            roomMessages.set(roomId, [])
            console.log(`Initialized new room: ${roomId}`)
          }
          
          // Add participant to room
          const roomParticipants = rooms.get(roomId)
          
          // Check if user is already in room with different socket
          let existingParticipant = null
          for (const [socketId, participant] of roomParticipants) {
            if (participant.id === userId) {
              existingParticipant = participant
              // Remove old socket entry
              roomParticipants.delete(socketId)
              console.log(`🔄 User ${userName} reconnected with new socket ${socket.id} (old: ${socketId})`)
              break
            }
          }
          
          const isHost = existingParticipant?.isHost || roomParticipants.size === 0 // Preserve host status or make first person host
          
          roomParticipants.set(socket.id, {
            id: userId,
            name: userName,
            socketId: socket.id,
            video: existingParticipant?.video ?? true,
            audio: existingParticipant?.audio ?? true,
            isHost,
            joinedAt: existingParticipant?.joinedAt || new Date().toISOString()
          })
          
          // Get all participants for this room
          const participants = Array.from(roomParticipants.values())
          
          // Send confirmation to the joining user first
          socket.emit('room-joined', { 
            roomId,
            userId,
            userName,
            isHost,
            participants,
            success: true
          })
          
          // Notify others about new user
          socket.to(roomId).emit('user-joined', { 
            userId, 
            userName, 
            socketId: socket.id,
            isHost,
            participants 
          })
          
          // Send chat notification about user joining
          socket.to(roomId).emit('user-joined', { userName })
          
          // Send current room state to new user
          socket.emit('room-state', { 
            participants,
            roomId,
            timestamp: new Date().toISOString()
          })
          
          console.log(`✅ User ${userName} (${userId}) successfully joined room ${roomId}. Total participants: ${participants.length}`)
          
          // Sync participants with database (skip in production to avoid self-calls)
          if (process.env.NODE_ENV !== 'production') {
            try {
              await fetch(`http://localhost:${port}/api/rooms/${roomId}/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeParticipants: participants })
              })
            } catch (syncError) {
              console.error('Failed to sync participants with database:', syncError)
            }
          }
          
        } catch (error) {
          console.error(`❌ Error joining room ${roomId}:`, error)
          socket.emit('room-join-error', { 
            roomId, 
            error: error.message,
            userId 
          })
        }
      } else {
        console.error('❌ Invalid join-room data:', data)
        socket.emit('room-join-error', { 
          error: 'Missing required data: roomId, userId, or userName',
          data 
        })
      }
    })

    // Leave room
    socket.on('leave-room', (data) => {
      // Handle both object and individual parameters
      let roomId, userId
      
      if (typeof data === 'object' && data !== null) {
        ({ roomId, userId } = data)
      } else if (arguments.length >= 2) {
        [roomId, userId] = arguments
      }
      
      // Validate parameters
      if (!roomId || !userId) {
        console.error('❌ Invalid leave-room data:', { roomId, userId })
        return
      }
      
      // Sanitize parameters
      roomId = String(roomId).trim()
      userId = String(userId).trim()
      
      if (roomId && userId) {
        const roomParticipants = rooms.get(roomId)
        if (roomParticipants) {
          roomParticipants.delete(socket.id)
          const participants = Array.from(roomParticipants.values())
          socket.to(roomId).emit('user-left', { userId, participants })
        }
        socket.leave(roomId)
        console.log(`User ${userId} left room ${roomId}`)
      }
    })

    // Join chat - send existing messages
    socket.on('join-chat', (data) => {
      const { roomId, userId, userName } = data || {}
      if (roomId) {
        socket.join(`chat-${roomId}`)
        const messages = roomMessages.get(roomId) || []
        socket.emit('room-messages', messages)
        console.log(`User ${userName} joined chat for room ${roomId}`)
      }
    })

    // Chat messages - store and broadcast to all including sender
    socket.on('chat-message', (data) => {
      const { roomId, message } = data || {}
      if (roomId && message) {
        // Store message
        const messages = roomMessages.get(roomId) || []
        messages.push(message)
        roomMessages.set(roomId, messages)
        
        // Broadcast to all users in room including sender
        io.to(roomId).emit('chat-message', message)
      }
    })

    // Message reactions
    socket.on('message-reaction', (data) => {
      const { roomId, messageId, emoji, userId, userName, action } = data || {}
      if (roomId && messageId && emoji) {
        // Broadcast reaction to all users in room
        io.to(roomId).emit('message-reaction', { messageId, emoji, userId, userName, action })
      }
    })

    // Message editing
    socket.on('edit-message', (data) => {
      const { roomId, messageId, newContent, userId } = data || {}
      if (roomId && messageId && newContent) {
        // Broadcast edit to all users in room
        io.to(roomId).emit('message-edited', { 
          messageId, 
          newContent, 
          editedAt: new Date().toISOString(),
          userId 
        })
      }
    })

    // Whiteboard session management
    socket.on('join-whiteboard', (data) => {
      const { roomId, userId, userName } = data || {}
      if (roomId) {
        socket.join(`whiteboard-${roomId}`)
        console.log(`User ${userName} joined whiteboard for room ${roomId}`)
      }
    })

    // Whiteboard updates
    socket.on('whiteboard-update', (data) => {
      const { roomId, ...updateData } = data || {}
      if (roomId) {
        // Broadcast to all users in room including sender for real-time collaboration
        io.to(roomId).emit('whiteboard-update', updateData)
      }
    })

    // Whiteboard sharing
    socket.on('share-whiteboard', (data) => {
      const { roomId, whiteboardData, userId, userName } = data || {}
      if (roomId && whiteboardData) {
        // Broadcast shared whiteboard to all users
        socket.to(roomId).emit('whiteboard-shared', { whiteboardData, sharedBy: userName })
      }
    })

    // Whiteboard clear
    socket.on('whiteboard-clear', (data) => {
      const { roomId, userId, userName } = data || {}
      if (roomId) {
        // Broadcast clear to all users
        io.to(roomId).emit('whiteboard-clear', { clearedBy: userName })
      }
    })

    // Notes updates
    socket.on('notes-update', (data) => {
      const { roomId, ...noteData } = data || {}
      if (roomId) {
        socket.to(roomId).emit('notes-update', noteData)
      }
    })

    // WebRTC signaling - improved with room-based routing
    socket.on('offer', (data) => {
      const { offer, to, from, roomId } = data || {}
      if (offer && to && from) {
        // Find target socket in room
        const roomParticipants = rooms.get(roomId)
        if (roomParticipants) {
          for (const [socketId, participant] of roomParticipants) {
            if (participant.id === to) {
              io.to(socketId).emit('offer', { offer, from })
              break
            }
          }
        }
      }
    })

    socket.on('answer', (data) => {
      const { answer, to, from, roomId } = data || {}
      if (answer && to && from) {
        // Find target socket in room
        const roomParticipants = rooms.get(roomId)
        if (roomParticipants) {
          for (const [socketId, participant] of roomParticipants) {
            if (participant.id === to) {
              io.to(socketId).emit('answer', { answer, from })
              break
            }
          }
        }
      }
    })

    socket.on('ice-candidate', (data) => {
      const { candidate, to, from, roomId } = data || {}
      if (candidate && to && from) {
        // Find target socket in room
        const roomParticipants = rooms.get(roomId)
        if (roomParticipants) {
          for (const [socketId, participant] of roomParticipants) {
            if (participant.id === to) {
              io.to(socketId).emit('ice-candidate', { candidate, from })
              break
            }
          }
        }
      }
    })

    // Media controls - update participant state
    socket.on('toggle-video', (data) => {
      const { roomId, userId, video } = data || {}
      if (roomId && userId !== undefined) {
        const roomParticipants = rooms.get(roomId)
        if (roomParticipants) {
          const participant = Array.from(roomParticipants.values()).find(p => p.id === userId)
          if (participant) {
            participant.video = video
            const participants = Array.from(roomParticipants.values())
            io.to(roomId).emit('user-media-changed', { userId, video })
            io.to(roomId).emit('room-state', { participants })
          }
        }
      }
    })

    socket.on('toggle-audio', (data) => {
      const { roomId, userId, audio } = data || {}
      if (roomId && userId !== undefined) {
        const roomParticipants = rooms.get(roomId)
        if (roomParticipants) {
          const participant = Array.from(roomParticipants.values()).find(p => p.id === userId)
          if (participant) {
            participant.audio = audio
            const participants = Array.from(roomParticipants.values())
            io.to(roomId).emit('user-media-changed', { userId, audio })
            io.to(roomId).emit('room-state', { participants })
          }
        }
      }
    })

    // File sharing
    socket.on('file-shared', (data) => {
      const { roomId, fileData } = data || {}
      if (roomId && fileData) {
        socket.to(roomId).emit('file-shared', fileData)
      }
    })

    socket.on('file-deleted', (data) => {
      const { roomId, fileId } = data || {}
      if (roomId && fileId) {
        socket.to(roomId).emit('file-deleted', { fileId })
      }
    })

    // Screen sharing
    socket.on('screen-share-started', (data) => {
      const { roomId, userId, userName } = data || {}
      if (roomId && userId) {
        socket.to(roomId).emit('screen-share-started', { userId, userName })
      }
    })

    socket.on('screen-share-stopped', (data) => {
      const { roomId, userId } = data || {}
      if (roomId && userId) {
        socket.to(roomId).emit('screen-share-stopped', { userId })
      }
    })

    // Code collaboration
    socket.on('code-update', (data) => {
      const { roomId, data: codeData } = data || {}
      if (roomId && codeData) {
        socket.to(roomId).emit('code-update', codeData)
      }
    })

    socket.on('code-shared', (data) => {
      const { roomId, code, language, userId, userName } = data || {}
      if (roomId && code) {
        socket.to(roomId).emit('code-shared', { code, language, userId, userName })
      }
    })

    socket.on('code-execution-result', (data) => {
      const { roomId, output, userId, userName } = data || {}
      if (roomId && output) {
        socket.to(roomId).emit('code-execution-result', { output, userId, userName })
      }
    })

    // Chat enhancements
    socket.on('user-typing', (data) => {
      const { roomId, userId, userName, isTyping } = data || {}
      if (roomId && userId) {
        socket.to(roomId).emit('user-typing', { userId, userName, isTyping })
      }
    })

    // Whiteboard enhancements
    socket.on('user-drawing', (data) => {
      const { roomId, userId, userName } = data || {}
      if (roomId && userId) {
        socket.to(roomId).emit('user-drawing', { userId, userName })
      }
    })

    socket.on('whiteboard-clear', (data) => {
      const { roomId } = data || {}
      if (roomId) {
        socket.to(roomId).emit('whiteboard-clear')
      }
    })

    // AI message sharing
    socket.on('ai-message-shared', (data) => {
      const { roomId, userMessage, aiMessage, sharedBy } = data || {}
      if (roomId && userMessage && aiMessage) {
        socket.to(roomId).emit('ai-message-received', {
          userMessage,
          aiMessage,
          sharedBy
        })
      }
    })

    // Room deletion
    socket.on('room-deleted', (data) => {
      const { roomId } = data || {}
      if (roomId) {
        // Notify all participants that room was deleted
        io.to(roomId).emit('room-deleted', { roomId })
        
        // Clean up room data
        rooms.delete(roomId)
        roomMessages.delete(roomId)
        
        console.log(`Room ${roomId} was deleted`)
      }
    })

    // Disconnect handling - clean up room data
    socket.on('disconnect', async (reason) => {
      console.log(`User disconnected: ${socket.id}, Reason: ${reason}`)
      
      // Find and remove user from all rooms
      for (const [roomId, roomParticipants] of rooms) {
        if (roomParticipants.has(socket.id)) {
          const participant = roomParticipants.get(socket.id)
          roomParticipants.delete(socket.id)
          
          const participants = Array.from(roomParticipants.values())
          
          // Notify others about user leaving
          socket.to(roomId).emit('user-left', { 
            userId: participant.id,
            userName: participant.name,
            participants,
            reason
          })
          
          // Send chat notification about user leaving
          socket.to(roomId).emit('user-left', { userName: participant.name })
          
          // If host left, assign new host
          if (participant.isHost && participants.length > 0) {
            const newHost = participants[0]
            newHost.isHost = true
            roomParticipants.set(newHost.socketId, newHost)
            
            // Notify about new host
            io.to(roomId).emit('host-changed', {
              newHostId: newHost.id,
              newHostName: newHost.name,
              participants: Array.from(roomParticipants.values())
            })
            
            console.log(`🔄 New host assigned: ${newHost.name} in room ${roomId}`)
          }
          
          // Clean up empty rooms after a delay
          if (roomParticipants.size === 0) {
            setTimeout(() => {
              if (rooms.has(roomId) && rooms.get(roomId).size === 0) {
                rooms.delete(roomId)
                roomMessages.delete(roomId)
                console.log(`🗑️ Cleaned up empty room: ${roomId}`)
              }
            }, 30000) // 30 second delay before cleanup
          }
          
          console.log(`👋 User ${participant.name} (${participant.id}) left room ${roomId}. Remaining: ${participants.length}`)
          
          // Sync remaining participants with database (skip in production)
          if (process.env.NODE_ENV !== 'production') {
            try {
              await fetch(`http://localhost:${port}/api/rooms/${roomId}/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeParticipants: participants })
              })
            } catch (syncError) {
              console.error('Failed to sync participants after disconnect:', syncError)
            }
          }
        }
      }
    })
  })

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})