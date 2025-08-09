import { NextRequest, NextResponse } from "next/server"
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { roomCode, userName, userEmail } = await request.json()

    if (!roomCode || !userName) {
      return NextResponse.json(
        { error: 'Room code and user name are required' },
        { status: 400 }
      )
    }

    await connectMongoose()

    // Find room by room code
    const room = await Room.findOne({ 
      roomCode: roomCode.toUpperCase(),
      isActive: true 
    })

    if (!room) {
      return NextResponse.json({ 
        error: "Room not found",
        message: `Room with code ${roomCode} does not exist or is not active` 
      }, { status: 404 })
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json({ 
        error: "Room is full",
        message: `Room has reached maximum capacity of ${room.maxParticipants} participants` 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      roomId: room._id.toString(),
      roomCode: room.roomCode,
      roomName: room.name,
      subject: room.subject
    })

  } catch (error) {
    return handleApiError(error, "Join room by code")
  }
}