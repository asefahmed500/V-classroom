import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import VideoCall from '@/models/VideoCall'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomName, maxParticipants = 50, settings = {} } = await request.json()

    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 })
    }

    await connectMongoose()

    // Generate unique room ID and code
    const roomId = uuidv4()
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const videoCall = new VideoCall({
      roomId,
      roomName,
      roomCode,
      hostId: session.user.id,
      hostName: session.user.name,
      maxParticipants,
      settings: {
        allowScreenShare: settings.allowScreenShare ?? true,
        allowFileShare: settings.allowFileShare ?? true,
        allowChat: settings.allowChat ?? true,
        requireApproval: settings.requireApproval ?? false,
        recordingEnabled: settings.recordingEnabled ?? false
      },
      participants: [{
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        socketId: '', // Will be set when user connects
        isHost: true,
        videoEnabled: true,
        audioEnabled: true,
        isScreenSharing: false,
        isHandRaised: false,
        joinedAt: new Date()
      }]
    })

    await videoCall.save()

    return NextResponse.json({
      success: true,
      videoCall: {
        roomId: videoCall.roomId,
        roomName: videoCall.roomName,
        roomCode: videoCall.roomCode,
        hostId: videoCall.hostId,
        hostName: videoCall.hostName,
        maxParticipants: videoCall.maxParticipants,
        settings: videoCall.settings,
        startedAt: videoCall.startedAt
      }
    })

  } catch (error) {
    console.error('Error creating video call:', error)
    return NextResponse.json(
      { error: 'Failed to create video call' },
      { status: 500 }
    )
  }
}