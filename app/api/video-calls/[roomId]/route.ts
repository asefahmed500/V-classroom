import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import VideoCall from '@/models/VideoCall'

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomId: params.roomId,
      isActive: true 
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      videoCall: {
        roomId: videoCall.roomId,
        roomName: videoCall.roomName,
        roomCode: videoCall.roomCode,
        hostId: videoCall.hostId,
        hostName: videoCall.hostName,
        participants: videoCall.participants.filter(p => !p.leftAt),
        messages: videoCall.messages.slice(-50), // Last 50 messages
        sharedFiles: videoCall.sharedFiles,
        settings: videoCall.settings,
        startedAt: videoCall.startedAt,
        isHost: session.user.id === videoCall.hostId
      }
    })

  } catch (error) {
    console.error('Error fetching video call:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video call' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, data } = await request.json()

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomId: params.roomId,
      isActive: true 
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    switch (action) {
      case 'join':
        await videoCall.addParticipant({
          userId: session.user.id,
          userName: session.user.name,
          userEmail: session.user.email,
          socketId: data.socketId,
          isHost: session.user.id === videoCall.hostId,
          videoEnabled: data.videoEnabled ?? true,
          audioEnabled: data.audioEnabled ?? true,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: new Date()
        })
        break

      case 'leave':
        await videoCall.removeParticipant(session.user.id)
        break

      case 'update-media':
        const participant = videoCall.participants.find(p => p.userId === session.user.id)
        if (participant) {
          if (data.videoEnabled !== undefined) participant.videoEnabled = data.videoEnabled
          if (data.audioEnabled !== undefined) participant.audioEnabled = data.audioEnabled
          if (data.isScreenSharing !== undefined) participant.isScreenSharing = data.isScreenSharing
          if (data.isHandRaised !== undefined) participant.isHandRaised = data.isHandRaised
          await videoCall.save()
        }
        break

      case 'end-call':
        if (session.user.id !== videoCall.hostId) {
          return NextResponse.json({ error: 'Only host can end call' }, { status: 403 })
        }
        await videoCall.endCall()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating video call:', error)
    return NextResponse.json(
      { error: 'Failed to update video call' },
      { status: 500 }
    )
  }
}