import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'
import { v4 as uuidv4 } from 'uuid'

const Room = require("@/models/Room")
const Connection = require("@/models/Connection")

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { userName, socketId, userAgent, deviceType = 'desktop' } = body

    if (!userName?.trim()) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    await connectMongoose()

    // Find the room
    const room = await Room.findById(roomId)
    if (!room || !room.isActive) {
      return NextResponse.json(
        { error: 'Room not found or inactive' },
        { status: 404 }
      )
    }

    // Check if room is full
    const activeConnections = await Connection.getActiveConnections(roomId)
    if (activeConnections.length >= room.maxParticipants) {
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 400 }
      )
    }

    // Check if private room and user authentication
    if (room.privacy === 'private' && !session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required for private rooms', requiresAuth: true },
        { status: 401 }
      )
    }

    // Generate user ID for guests or use authenticated user ID
    const userId = session?.user?.id || `guest_${uuidv4()}`
    const userEmail = session?.user?.email || null
    const isGuest = !session?.user?.id

    // Check if user is already connected
    const existingConnection = await Connection.findOne({
      roomId,
      userId,
      status: { $in: ['connected', 'reconnecting'] }
    })

    let connection
    if (existingConnection) {
      // Reconnect existing user
      connection = await existingConnection.reconnect(socketId || uuidv4())
    } else {
      // Create new connection
      connection = new Connection({
        connectionId: uuidv4(),
        socketId: socketId || uuidv4(),
        userId,
        userName: userName.trim(),
        userEmail,
        isGuest,
        roomId,
        roomCode: room.roomCode,
        status: 'connected',
        userAgent,
        sessionData: {
          joinMethod: 'code',
          deviceType,
          browser: userAgent ? getBrowserFromUserAgent(userAgent) : 'unknown',
          permissions: {
            canShare: room.settings.allowFileShare,
            canChat: room.settings.allowChat,
            canUseWhiteboard: room.settings.allowWhiteboard,
            canManageRoom: userId === room.createdBy
          }
        }
      })
      await connection.save()
    }

    // Update room participants (legacy support)
    const participantExists = room.participants.some((p: any) => p.userId === userId)
    if (!participantExists) {
      room.participants.push({
        userId,
        userName: userName.trim(),
        userEmail,
        isHost: userId === room.createdBy,
        isGuest,
        joinedAt: new Date(),
        socketId: connection.socketId
      })
    }

    room.lastActivity = new Date()
    await room.save()

    // Clean up stale connections
    await Connection.cleanupStaleConnections()

    return NextResponse.json({
      success: true,
      message: 'Successfully joined room',
      connection: {
        connectionId: connection.connectionId,
        userId: connection.userId,
        userName: connection.userName,
        isGuest: connection.isGuest,
        isHost: userId === room.createdBy,
        permissions: connection.sessionData.permissions
      },
      room: {
        id: room._id.toString(),
        name: room.name,
        subject: room.subject,
        roomCode: room.roomCode,
        settings: room.settings,
        participantCount: activeConnections.length + 1
      }
    })

  } catch (error) {
    return handleApiError(error, "Join room")
  }
}

// Helper function to extract browser from user agent
function getBrowserFromUserAgent(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return 'Unknown'
}