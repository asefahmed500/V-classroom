import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params
    const { userId, roomId, isFavorite } = await request.json()

    if (!fileId || !userId) {
      return NextResponse.json(
        { error: 'File ID and User ID are required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()

    // Find the file
    const file = await db.collection('files').findOne({ 
      fileId: fileId,
      isDeleted: false 
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Update or create user favorite
    if (isFavorite) {
      await db.collection('user_favorites').updateOne(
        { userId, fileId },
        { 
          $set: {
            userId,
            fileId,
            roomId,
            addedAt: new Date()
          }
        },
        { upsert: true }
      )
    } else {
      await db.collection('user_favorites').deleteOne({
        userId,
        fileId
      })
    }

    return NextResponse.json({
      success: true,
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
      isFavorite
    })

  } catch (error) {
    console.error('Favorite toggle error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}