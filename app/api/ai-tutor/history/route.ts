import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes
const chatHistories = new Map<string, any[]>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const userId = searchParams.get('userId')

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'roomId and userId are required' },
        { status: 400 }
      )
    }

    const historyKey = `${roomId}-${userId}`
    const messages = chatHistories.get(historyKey) || []

    return NextResponse.json({
      messages: messages,
      roomId: roomId,
      userId: userId
    })

  } catch (error) {
    console.error('AI Tutor history error:', error)
    return NextResponse.json(
      { error: 'Failed to get chat history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, messages } = await request.json()

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'roomId and userId are required' },
        { status: 400 }
      )
    }

    const historyKey = `${roomId}-${userId}`
    chatHistories.set(historyKey, messages || [])

    return NextResponse.json({
      success: true,
      message: 'Chat history saved',
      messageCount: messages?.length || 0
    })

  } catch (error) {
    console.error('AI Tutor history save error:', error)
    return NextResponse.json(
      { error: 'Failed to save chat history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}