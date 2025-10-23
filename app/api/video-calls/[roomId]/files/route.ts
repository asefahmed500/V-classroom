import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongodb'
import VideoCall from '@/models/VideoCall'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomId: params.roomId,
      isActive: true 
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    // Check if user is participant
    const isParticipant = videoCall.participants.some(p => p.userId === session.user.id && !p.leftAt)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
    }

    // Check if file sharing is allowed
    if (!videoCall.settings.allowFileShare) {
      return NextResponse.json({ error: 'File sharing is disabled for this call' }, { status: 403 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'video-calls', params.roomId)
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const fileId = uuidv4()
    const fileExtension = path.extname(file.name)
    const fileName = `${fileId}${fileExtension}`
    const filePath = path.join(uploadsDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/video-calls/${params.roomId}/${fileName}`

    const sharedFile = {
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileUrl,
      uploadedBy: session.user.id,
      uploaderName: session.user.name,
      uploadedAt: new Date(),
      downloadCount: 0
    }

    await videoCall.addSharedFile(sharedFile)

    return NextResponse.json({
      success: true,
      file: sharedFile
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectMongoose()

    const videoCall = await VideoCall.findOne({ 
      roomId: params.roomId,
      isActive: true 
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    // Check if user is participant
    const isParticipant = videoCall.participants.some(p => p.userId === session.user.id)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      files: videoCall.sharedFiles
    })

  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}