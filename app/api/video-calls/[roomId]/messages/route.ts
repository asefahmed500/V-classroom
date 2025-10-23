import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import VideoCall from '@/models/VideoCall'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, type = 'text', fileUrl, fileName, fileSize } = await request.json()

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Message content or file is required' }, { status: 400 })
    }

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomId: params.roomId,
      isActive: true 
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    // Check if user is participant
    const isParticipant = videoCall.participants.some(p => p.userId === session.user.id && !p.leftAt)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
    }

    const message = {
      id: uuidv4(),
      userId: session.user.id,
      userName: session.user.name,
      content: content || fileName,
      type,
      fileUrl,
      fileName,
      fileSize,
      timestamp: new Date(),
      reactions: [],
      isEdited: false
    }

    await videoCall.addMessage(message)

    return NextResponse.json({
      success: true,
      message
    })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomId: params.roomId,
      isActive: true 
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    // Check if user is participant
    const isParticipant = videoCall.participants.some(p => p.userId === session.user.id)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
    }

    const messages = videoCall.messages
      .slice(-limit - offset, -offset || undefined)
      .reverse()

    return NextResponse.json({
      success: true,
      messages,
      hasMore: videoCall.messages.length > limit + offset
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}