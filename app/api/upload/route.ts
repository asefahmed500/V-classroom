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
    const file = formData.get('file') as File
    const roomId = formData.get('roomId') as string
    const userId = formData.get('userId') as string
    const userName = formData.get('userName') as string

    if (!file || !roomId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine resource type
    const resourceType = file.type.startsWith('video/') ? 'video' : 
                        file.type.startsWith('image/') ? 'image' : 'raw'

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: `virtual-study-rooms/files/${roomId.toUpperCase()}`,
          public_id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })

    const result = uploadResult as any

    // Generate thumbnail URL for images
    let thumbnailUrl = null
    if (file.type.startsWith('image/')) {
      thumbnailUrl = cloudinary.url(result.public_id, {
        width: 200,
        height: 200,
        crop: 'fill',
        quality: 'auto',
        format: 'jpg'
      })
    }

    // Save file metadata to database
    const { db } = await connectToDatabase()
    
    const fileData = {
      fileId: result.public_id,
      roomId: roomId.toUpperCase(),
      fileName: result.public_id,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileUrl: result.secure_url,
      thumbnail: thumbnailUrl,
      uploadedBy: userId,
      uploadedByName: userName,
      uploadedAt: new Date(),
      downloadCount: 0,
      isDeleted: false
    }

    await db.collection('files').insertOne(fileData)

    return NextResponse.json({
      success: true,
      file: {
        id: result.public_id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: result.secure_url,
        thumbnail: thumbnailUrl,
        uploadedBy: userName,
        uploadedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}