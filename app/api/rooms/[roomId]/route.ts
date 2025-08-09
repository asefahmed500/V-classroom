import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Room = require("@/models/Room")
const Connection = require("@/models/Connection")
const User = require("@/models/User")

export const dynamic = 'force-dynamic'

// GET room details
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
    return handleApiError(error, "Get room")
  }
}

// DELETE room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    // Find the room
    const room = await Room.findById(roomId)
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator
    if (room.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the room creator can delete this room' },
        { status: 403 }
      )
    }

    // Delete all connections for this room
    await Connection.deleteMany({ roomId: roomId })

    // Delete the room
    await Room.findByIdAndDelete(roomId)

    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
      deletedRoom: {
        id: room._id.toString(),
        name: room.name,
        roomCode: room.roomCode
      }
    })

  } catch (error) {
    return handleApiError(error, "Delete room")
  }
}

// UPDATE room
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    const body = await request.json()
    const { name, subject, description, maxParticipants, privacy, settings, isActive } = body

    await connectMongoose()

    // Find the room
    const room = await Room.findById(roomId)
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator
    if (room.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the room creator can update this room' },
        { status: 403 }
      )
    }

    // Update room fields
    if (name?.trim()) room.name = name.trim()
    if (subject) room.subject = subject
    if (description !== undefined) room.description = description?.trim() || ''
    if (maxParticipants) room.maxParticipants = maxParticipants
    if (privacy) room.privacy = privacy
    if (isActive !== undefined) room.isActive = isActive
    if (settings) {
      room.settings = {
        ...room.settings,
        ...settings
      }
    }

    room.lastActivity = new Date()
    await room.save()

    const roomData = {
      id: room._id.toString(),
      name: room.name,
      subject: room.subject,
      description: room.description,
      roomCode: room.roomCode,
      createdBy: room.createdBy,
      maxParticipants: room.maxParticipants,
      privacy: room.privacy,
      isActive: room.isActive,
      settings: room.settings,
      lastActivity: room.lastActivity
    }

    return NextResponse.json({
      success: true,
      message: 'Room updated successfully',
      room: roomData
    })

  } catch (error) {
    return handleApiError(error, "Update room")
  }
}