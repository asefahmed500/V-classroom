import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()

    // Generate unique room code
    let roomCode = generateRoomCode()
    let existingRoom = await Room.findOne({ roomCode })
    
    // Ensure room code is unique
    while (existingRoom) {
      roomCode = generateRoomCode()
      existingRoom = await Room.findOne({ roomCode })
    }

    // Create test room
    const room = new Room({
      name: 'Test Room',
      subject: 'Testing',
      description: 'Test room for debugging',
      roomCode,
      createdBy: 'test-user',
      maxParticipants: 8,
      privacy: 'public',
      settings: {
        allowScreenShare: true,
        allowFileShare: true,
        allowChat: true,
        allowWhiteboard: true,
        allowNotes: true
      },
      participants: [],
      isActive: true,
      lastActivity: new Date()
    })

    await room.save()

    // Immediately fetch it back to verify
    const fetchedRoom = await Room.findById(room._id).lean()

    return NextResponse.json({
      success: true,
      message: 'Test room created and verified',
      created: {
        id: room._id.toString(),
        roomCode: room.roomCode,
        name: room.name
      },
      fetched: {
        id: fetchedRoom._id.toString(),
        roomCode: fetchedRoom.roomCode,
        name: fetchedRoom.name
      },
      codesMatch: room.roomCode === fetchedRoom.roomCode
    })

  } catch (error) {
    console.error('Test room creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create test room', details: error.message },
      { status: 500 }
    )
  }
}