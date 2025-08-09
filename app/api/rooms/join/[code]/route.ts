import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'

const Room = require("@/models/Room")
const User = require("@/models/User")

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { message: 'Room code is required' },
        { status: 400 }
      )
    }

    // Connect to MongoDB using mongoose
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/virtual-study-rooms")
    }

    // Find the room - try both original case and uppercase
    let room = await Room.findOne({ 
      roomCode: code,
      isActive: true 
    }).lean()

    // If not found, try uppercase
    if (!room) {
      room = await Room.findOne({ 
        roomCode: code.toUpperCase(),
        isActive: true 
      }).lean()
    }

    // If still not found, try lowercase
    if (!room) {
      room = await Room.findOne({ 
        roomCode: code.toLowerCase(),
        isActive: true 
      }).lean()
    }

    if (!room) {
      return NextResponse.json(
        { message: 'Room not found or inactive' },
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

    // Return room info for validation
    return NextResponse.json({
      roomId: room._id.toString(),
      roomCode: room.roomCode,
      roomName: room.name,
      subject: room.subject,
      description: room.description,
      participants: room.participants?.length || 0,
      maxParticipants: room.maxParticipants,
      privacy: room.privacy,
      isActive: room.isActive,
      createdAt: room.createdAt,
      createdBy: room.createdBy,
      creatorName: creatorInfo?.name,
      creatorEmail: creatorInfo?.email
    })

  } catch (error) {
    console.error('Validate room code error:', error)
    return NextResponse.json(
      { message: 'Failed to validate room code' },
      { status: 500 }
    )
  }
}