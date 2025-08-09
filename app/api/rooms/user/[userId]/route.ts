import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    await connectMongoose()

    // Find rooms created by the user
    const rooms = await Room.find({ 
      createdBy: userId 
    }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      rooms: rooms.map(room => ({
        _id: room._id.toString(),
        name: room.name,
        subject: room.subject,
        description: room.description,
        roomCode: room.roomCode,
        participants: room.participants || [],
        maxParticipants: room.maxParticipants,
        privacy: room.privacy,
        isActive: room.isActive,
        createdAt: room.createdAt,
        settings: room.settings
      }))
    })

  } catch (error) {
    return handleApiError(error, "Get user rooms")
  }
}