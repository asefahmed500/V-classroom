import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongodb'
import { handleApiError } from '@/lib/api-helpers'

const File = require('@/models/File')

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    
    await connectMongoose()

    const files = await File.find({
      roomId,
      isDeleted: false
    }).sort({ uploadedAt: -1 }).lean()

    const formattedFiles = files.map(file => ({
      id: file.fileId,
      name: file.originalName || file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      thumbnail: file.thumbnail,
      uploadedBy: file.uploadedBy,
      uploadedByName: file.uploadedByName,
      uploadedAt: file.uploadedAt.getTime(),
      downloads: file.downloads || 0,
      isShared: file.isShared,
      isFavorite: false, // Will be set per user
      tags: file.tags || [],
      description: file.description || ''
    }))

    return NextResponse.json({
      success: true,
      files: formattedFiles
    })

  } catch (error) {
    return handleApiError(error, "Get room files")
  }
}