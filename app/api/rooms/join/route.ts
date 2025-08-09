import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes
const rooms = new Map<string, any>()
const roomParticipants = new Map<string, Set<any>>()

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, userName } = await request.json()

    if (!roomId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'roomId, userId, and userName are required' },
        { status: 400 }
      )
    }

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        subject: 'General Study',
        description: 'Collaborative study room',
        roomType: 'discussion',
        isPrivate: false,
        roomCode: roomId,
        maxParticipants: 50, // Increased capacity
        settings: {
          allowChat: true,
          allowScreenShare: true,
          allowFileShare: true,
          allowWhiteboard: true,
          allowCode: true
        },
        createdAt: new Date(),
        participants: []
      })
      roomParticipants.set(roomId, new Set())
    }

    const room = rooms.get(roomId)
    const participants = roomParticipants.get(roomId)

    // Check if room is at capacity
    if (participants && participants.size >= room.maxParticipants) {
      return NextResponse.json(
        { 
          error: 'Room is full', 
          message: `Room has reached maximum capacity. Currently ${participants.size} active participants.` 
        },
        { status: 400 }
      )
    }

    // Check if user is already in the room
    const existingParticipant = Array.from(participants || []).find((p: any) => p.userId === userId)
    
    if (!existingParticipant) {
      // Add new participant
      const participant = {
        userId,
        userName,
        socketId: `socket_${userId}_${Date.now()}`,
        joinedAt: new Date(),
        isHost: participants?.size === 0, // First user becomes host
        isOnline: true,
        video: true,
        audio: true
      }

      participants?.add(participant)
      
      // Update room participants array
      room.participants = Array.from(participants || [])
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined room',
      room: room,
      participant: {
        userId,
        userName,
        isHost: participants?.size === 1
      }
    })

  } catch (error) {
    console.error('Room join error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to join room' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('roomId')

  if (!roomId) {
    return NextResponse.json(
      { error: 'Missing roomId parameter' },
      { status: 400 }
    )
  }

  const room = rooms.get(roomId)
  const participants = roomParticipants.get(roomId)

  if (!room) {
    return NextResponse.json(
      { error: 'Room not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    room: {
      ...room,
      participants: Array.from(participants || [])
    }
  })
}