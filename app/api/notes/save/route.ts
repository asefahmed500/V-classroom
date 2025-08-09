import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { roomId, content, userId, userName } = await request.json()

    if (!roomId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Save or update notes
    await db.collection('notes').updateOne(
      { roomId: roomId.toUpperCase() },
      {
        $set: {
          content: content || '',
          lastModifiedBy: userId,
          lastModifiedByName: userName,
          lastModifiedAt: new Date()
        },
        $setOnInsert: {
          roomId: roomId.toUpperCase(),
          createdAt: new Date(),
          version: 1
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Notes saved successfully'
    })

  } catch (error) {
    console.error('Notes save error:', error)
    return NextResponse.json(
      { error: 'Failed to save notes' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    const notes = await db.collection('notes').findOne({ 
      roomId: roomId.toUpperCase() 
    })

    return NextResponse.json({
      success: true,
      content: notes?.content || '',
      lastModifiedAt: notes?.lastModifiedAt,
      lastModifiedBy: notes?.lastModifiedByName
    })

  } catch (error) {
    console.error('Notes fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}