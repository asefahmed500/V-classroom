import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

export async function DELETE(
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

    // Check if user can delete (owner or room host)
    if (file.uploadedBy !== userId) {
      // Check if user is room host
      const room = await db.collection('rooms').findOne({ roomId: roomId })
      
      if (!room || room.createdBy !== userId) {
        return NextResponse.json(
          { error: 'You can only delete your own files or files in rooms you host' },
          { status: 403 }
        )
      }
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(fileId)
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError)
      // Continue with database deletion even if Cloudinary fails
    }

    // Soft delete in database
    await db.collection('files').updateOne(
      { fileId: fileId },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params
    
    const { db } = await connectToDatabase()

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

    const formattedFile = {
      id: file.fileId,
      name: file.originalName || file.fileName,
      size: file.fileSize,
      type: file.fileType,
      url: file.fileUrl,
      thumbnail: file.thumbnail,
      uploadedBy: file.uploadedBy,
      uploadedByName: file.uploadedByName,
      uploadedAt: file.uploadedAt.getTime(),
      downloads: file.downloadCount || 0,
      isShared: true,
      tags: [],
      description: ''
    }

    return NextResponse.json({
      success: true,
      file: formattedFile
    })

  } catch (error) {
    console.error('Get file error:', error)
    return NextResponse.json(
      { error: 'Failed to get file' },
      { status: 500 }
    )
  }
}