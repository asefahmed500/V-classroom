import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'

const Room = require("@/models/Room")

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testCode = searchParams.get('code') || '68965f3a5d5c120f26be472b'

    await connectMongoose()

    console.log('Testing room code:', testCode)

    // Try to find the room with exact match
    let room = await Room.findOne({ roomCode: testCode }).lean()
    console.log('Exact match result:', room ? 'Found' : 'Not found')

    if (!room) {
      // Try uppercase
      room = await Room.findOne({ roomCode: testCode.toUpperCase() }).lean()
      console.log('Uppercase match result:', room ? 'Found' : 'Not found')
    }

    if (!room) {
      // Try lowercase
      room = await Room.findOne({ roomCode: testCode.toLowerCase() }).lean()
      console.log('Lowercase match result:', room ? 'Found' : 'Not found')
    }

    // Get all room codes for comparison
    const allRooms = await Room.find({}).select('roomCode name isActive').lean()
    console.log('All room codes in database:', allRooms.map(r => ({ code: r.roomCode, name: r.name, active: r.isActive })))

    return NextResponse.json({
      success: true,
      testCode,
      found: !!room,
      room: room ? {
        id: room._id.toString(),
        name: room.name,
        roomCode: room.roomCode,
        isActive: room.isActive
      } : null,
      allRoomCodes: allRooms.map(r => r.roomCode),
      totalRooms: allRooms.length
    })

  } catch (error) {
    console.error('Test code error:', error)
    return NextResponse.json(
      { error: 'Failed to test code', details: error.message },
      { status: 500 }
    )
  }
}