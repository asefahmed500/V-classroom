import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    const whiteboards = await db.collection('whiteboards')
      .find({ roomId: roomId.toUpperCase() })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      whiteboards: whiteboards.map(wb => ({
        id: wb._id,
        imageUrl: wb.imageUrl,
        drawings: wb.drawings,
        createdAt: wb.createdAt,
        userId: wb.userId
      }))
    })

  } catch (error) {
    console.error('Whiteboard fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whiteboard data' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params
    const { drawings, userId } = await request.json()

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Room ID and User ID are required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    await db.collection('whiteboard_state').updateOne(
      { roomId: roomId.toUpperCase() },
      {
        $set: {
          drawings: drawings || [],
          lastModifiedBy: userId,
          lastModifiedAt: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Whiteboard state updated'
    })

  } catch (error) {
    console.error('Whiteboard update error:', error)
    return NextResponse.json(
      { error: 'Failed to update whiteboard' },
      { status: 500 }
    )
  }
}