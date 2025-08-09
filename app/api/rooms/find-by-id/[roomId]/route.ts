import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Room = require("@/models/Room")
const User = require("@/models/User")

export const dynamic = 'force-dynamic'

// GET room details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    
    // Validate roomId format
    if (!roomId || roomId.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid room ID' },
        { status: 400 }
      )
    }
    
    // Check if it's a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID format' },
        { status: 400 }
      )
    }
    
    await connectMongoose()

    const room = await Room.findById(roomId).lean()
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Fetch creator information
    let creatorInfo = null
    if (room.createdBy) {
      try {
        const creator = await User.findById(room.createdBy).select('name email').lean()
        if (creator) {
          creatorInfo = {
            name: creator.name,
            email: creator.email
          }
        }
      } catch (error) {
        console.error('Error fetching creator info:', error)
      }
    }

    const roomData = {
      id: room._id.toString(),
      name: room.name,
      subject: room.subject,
      description: room.description,
      roomCode: room.roomCode,
      createdBy: room.createdBy,
      creatorName: creatorInfo?.name,
      creatorEmail: creatorInfo?.email,
      maxParticipants: room.maxParticipants,
      participantCount: room.participants?.length || 0,
      privacy: room.privacy,
      isActive: room.isActive,
      createdAt: room.createdAt,
      settings: room.settings
    }

    return NextResponse.json({
      success: true,
      room: roomData
    })

  } catch (error) {
    return handleApiError(error, "Find room by ID")
  }
}