import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { connectToDatabase } from '@/lib/mongodb'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const recording = formData.get('recording') as File
    const roomId = formData.get('roomId') as string
    const userId = formData.get('userId') as string
    const userName = formData.get('userName') as string
    const duration = formData.get('duration') as string

    if (!recording || !roomId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await recording.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'room-recordings',
          public_id: `room-${roomId}-${Date.now()}`,
          format: 'mp4', // Convert to MP4 for better compatibility
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    }) as any

    // Save recording metadata to database
    const { db } = await connectToDatabase()
    
    const recordingData = {
      roomId,
      userId,
      userName,
      duration: parseInt(duration),
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileSize: recording.size,
      format: uploadResult.format,
      createdAt: new Date(),
      isActive: true
    }

    await db.collection('recordings').insertOne(recordingData)

    return NextResponse.json({
      success: true,
      recording: {
        id: recordingData.publicId,
        url: recordingData.url,
        duration: recordingData.duration,
        createdAt: recordingData.createdAt
      }
    })

  } catch (error) {
    console.error('Recording upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload recording' },
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
    
    const recordings = await db.collection('recordings')
      .find({ roomId, isActive: true })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      recordings: recordings.map(recording => ({
        id: recording.publicId,
        url: recording.url,
        duration: recording.duration,
        userName: recording.userName,
        createdAt: recording.createdAt,
        fileSize: recording.fileSize
      }))
    })

  } catch (error) {
    console.error('Get recordings error:', error)
    return NextResponse.json(
      { error: 'Failed to get recordings' },
      { status: 500 }
    )
  }
}