import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    // Get all active rooms with their codes
    const rooms = await Room.find({ isActive: true })
      .select('name roomCode createdAt participants')
      .lean()

    const roomsData = rooms.map((room: any) => ({
      id: room._id.toString(),
      name: room.name,
      roomCode: room.roomCode,
      codeLength: room.roomCode?.length || 0,
      participantCount: room.participants?.length || 0,
      createdAt: room.createdAt
    }))

    return NextResponse.json({
      success: true,
      totalRooms: roomsData.length,
      rooms: roomsData
    })

  } catch (error) {
    console.error('Debug rooms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: error.message },
      { status: 500 }
    )
  }
}