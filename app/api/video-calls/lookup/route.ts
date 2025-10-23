import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'
import VideoCall from '@/models/VideoCall'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomCode = searchParams.get('code')

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 })
    }

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomCode: roomCode.toUpperCase(),
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
        settings: videoCall.settings,
        startedAt: videoCall.startedAt
      }
    })

  } catch (error) {
    console.error('Error looking up video call:', error)
    return NextResponse.json(
      { error: 'Failed to lookup video call' },
      { status: 500 }
    )
  }
}