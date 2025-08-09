import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await connectMongoose()

    // Try to find by MongoDB ObjectId
    let room = null
    try {
      room = await Room.findById(id).lean()
    } catch (error) {
      // Invalid ObjectId format
    }

    if (!room) {
      // Try to find by room code
      room = await Room.findOne({ roomCode: id }).lean()
    }

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found', searchedId: id },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room._id.toString(),
        name: room.name,
        roomCode: room.roomCode,
        subject: room.subject,
        description: room.description,
        participants: room.participants?.length || 0,
        maxParticipants: room.maxParticipants,
        privacy: room.privacy,
        isActive: room.isActive,
        createdAt: room.createdAt
      },
      foundBy: room.roomCode === id ? 'roomCode' : 'objectId'
    })

  } catch (error) {
    console.error('Find room error:', error)
    return NextResponse.json(
      { error: 'Failed to find room', details: error.message },
      { status: 500 }
    )
  }
}