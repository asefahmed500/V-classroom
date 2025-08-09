import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier } = body // Can be room code or room ID

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      )
    }

    await connectMongoose()

    let room = null
    let foundBy = ''

    // Try to find by room code first (most common case)
    room = await Room.findOne({ 
      roomCode: identifier,
      isActive: true 
    }).lean()
    
    if (room) {
      foundBy = 'roomCode'
    } else {
      // Try case-insensitive room code
      room = await Room.findOne({ 
        roomCode: { $regex: new RegExp(`^${identifier}$`, 'i') },
        isActive: true 
      }).lean()
      
      if (room) {
        foundBy = 'roomCodeCaseInsensitive'
      } else {
        // Try to find by MongoDB ObjectId
        try {
          room = await Room.findById(identifier).lean()
          if (room) {
            foundBy = 'objectId'
          }
        } catch (error) {
          // Invalid ObjectId format, ignore
        }
      }
    }

    if (!room) {
      return NextResponse.json(
        { 
          error: 'Room not found',
          identifier,
          message: 'No room found with the provided identifier'
        },
        { status: 404 }
      )
    }

    // Return standardized room data
    const roomData = {
      id: room._id.toString(),
      roomId: room._id.toString(),
      name: room.name,
      roomName: room.name,
      subject: room.subject,
      description: room.description,
      roomCode: room.roomCode,
      participants: room.participants?.length || 0,
      maxParticipants: room.maxParticipants,
      privacy: room.privacy,
      isActive: room.isActive,
      createdAt: room.createdAt,
      createdBy: room.createdBy,
      settings: room.settings
    }

    return NextResponse.json({
      success: true,
      room: roomData,
      foundBy,
      identifier
    })

  } catch (error) {
    console.error('Room lookup error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to lookup room',
        details: error.message 
      },
      { status: 500 }
    )
  }
}