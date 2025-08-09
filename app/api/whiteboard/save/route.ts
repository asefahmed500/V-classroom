import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, imageData, drawings } = await request.json()

    if (!roomId || !userId || !imageData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const uploadResult = await cloudinary.uploader.upload(imageData, {
      folder: `virtual-study-rooms/whiteboards/${roomId.toUpperCase()}`,
      public_id: `whiteboard-${Date.now()}`,
      resource_type: 'image'
    })

    const { db } = await connectToDatabase()
    
    const whiteboardData = {
      roomId: roomId.toUpperCase(),
      userId,
      imageUrl: uploadResult.secure_url,
      drawings: drawings || [],
      createdAt: new Date(),
      cloudinaryId: uploadResult.public_id
    }

    await db.collection('whiteboards').insertOne(whiteboardData)

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      message: 'Whiteboard saved successfully'
    })

  } catch (error) {
    console.error('Whiteboard save error:', error)
    return NextResponse.json(
      { error: 'Failed to save whiteboard' },
      { status: 500 }
    )
  }
}