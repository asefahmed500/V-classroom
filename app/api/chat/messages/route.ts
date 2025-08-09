import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    const messages = await db.collection('messages')
      .find({ 
        roomId: roomId.toUpperCase(),
        isDeleted: false 
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit
    })

  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, userName, message, type, fileData, replyTo } = await request.json()

    if (!roomId || !userId || !userName || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const { db } = await connectToDatabase()

    const messageData = {
      messageId,
      roomId: roomId.toUpperCase(),
      userId,
      userName,
      message,
      type: type || 'text',
      fileData: fileData || null,
      replyTo: replyTo || null,
      reactions: [],
      createdAt: new Date(),
      isDeleted: false
    }

    await db.collection('messages').insertOne(messageData)

    return NextResponse.json({
      success: true,
      message: messageData
    })

  } catch (error) {
    console.error('Message save error:', error)
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    )
  }
}