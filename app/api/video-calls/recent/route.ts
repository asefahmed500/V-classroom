import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import VideoCall from '@/models/VideoCall'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectMongoose()

    // Find video calls where user was a participant
    const videoCalls = await VideoCall.find({
      $or: [
        { hostId: session.user.id },
        { 'participants.userId': session.user.id }
      ]
    })
    .sort({ startedAt: -1 })
    .limit(10)

    const recentCalls = videoCalls.map(call => ({
      roomId: call.roomId,
      roomName: call.roomName,
      roomCode: call.roomCode,
      hostName: call.hostName,
      participantCount: call.participants.filter(p => !p.leftAt).length,
      startedAt: call.startedAt,
      duration: call.duration || 0,
      isHost: call.hostId === session.user.id
    }))

    return NextResponse.json({
      success: true,
      calls: recentCalls
    })

  } catch (error) {
    console.error('Error fetching recent calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent calls' },
      { status: 500 }
    )
  }
}