import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params
    const { userId, roomId } = await request.json()

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

    // Increment download count
    await db.collection('files').updateOne(
      { fileId: fileId },
      { 
        $inc: { downloadCount: 1 },
        $set: { lastAccessed: new Date() }
      }
    )

    // Log download activity
    await db.collection('file_downloads').insertOne({
      fileId,
      userId,
      roomId,
      downloadedAt: new Date(),
      userAgent: request.headers.get('user-agent') || 'Unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Download tracked successfully',
      downloadCount: (file.downloadCount || 0) + 1
    })

  } catch (error) {
    console.error('Download tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    )
  }
}