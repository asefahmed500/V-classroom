import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, subject, description, maxParticipants, privacy, settings } = body

    if (!name?.trim() || !subject) {
      return NextResponse.json(
        { error: 'Room name and subject are required' },
        { status: 400 }
      )
    }

    await connectMongoose()

    // Generate unique room code
    let roomCode = generateRoomCode()
    let existingRoom = await Room.findOne({ roomCode })
    
    // Ensure room code is unique
    while (existingRoom) {
      roomCode = generateRoomCode()
      existingRoom = await Room.findOne({ roomCode })
    }

    // Create room
    const room = new Room({
      name: name.trim(),
      subject,
      description: description?.trim() || '',
      roomCode,
      createdBy: session.user.id,
      maxParticipants: maxParticipants || 8,
      privacy: privacy || 'public',
      settings: {
        allowScreenShare: settings?.allowScreenShare ?? true,
        allowFileShare: settings?.allowFileShare ?? true,
        allowChat: settings?.allowChat ?? true,
        allowWhiteboard: settings?.allowWhiteboard ?? true,
        allowNotes: settings?.allowNotes ?? true
      },
      participants: [],
      isActive: true,
      lastActivity: new Date()
    })

    await room.save()

    // Return created room data
    const roomData = {
      _id: room._id.toString(),
      name: room.name,
      subject: room.subject,
      description: room.description,
      roomCode: room.roomCode,
      createdBy: room.createdBy,
      maxParticipants: room.maxParticipants,
      privacy: room.privacy,
      settings: room.settings,
      createdAt: room.createdAt,
      isActive: room.isActive
    }

    return NextResponse.json({
      success: true,
      message: 'Room created successfully',
      room: roomData
    })

  } catch (error) {
    return handleApiError(error, "Create room")
  }
}