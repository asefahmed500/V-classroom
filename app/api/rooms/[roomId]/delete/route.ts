import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const Room = require("@/models/Room")
const Connection = require("@/models/Connection")

export const dynamic = 'force-dynamic'

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
      message: 'Room deleted successfully'
    })

  } catch (error) {
    return handleApiError(error, "Delete room")
  }
}