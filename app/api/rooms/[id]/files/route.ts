import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import mongoose from "mongoose"

// File model
const FileSchema = new mongoose.Schema({
  originalName: String,
  fileName: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  roomId: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadedByName: String,
  uploadedAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 },
})

const File = mongoose.models.File || mongoose.model("File", FileSchema)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const { id: roomId } = await params

    // Get files for the room
    const files = await File.find({ roomId })
      .populate("uploadedBy", "name")
      .sort({ uploadedAt: -1 })

    return NextResponse.json({
      success: true,
      files: files.map(file => ({
        id: file._id.toString(),
        name: file.originalName,
        size: file.fileSize,
        type: file.mimeType,
        url: file.filePath,
        uploadedBy: file.uploadedByName || file.uploadedBy?.name || "Unknown",
        uploadedAt: file.uploadedAt.getTime(),
        downloadCount: file.downloadCount,
      }))
    })

  } catch (error) {
    console.error("Get files error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id: roomId } = await params
    const { fileName, filePath, fileSize, mimeType, originalName } = await request.json()

    // Get user info
    const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
      name: String,
      email: String,
    }))
    
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Save file metadata
    const file = new File({
      originalName,
      fileName,
      filePath,
      fileSize,
      mimeType,
      roomId,
      uploadedBy: userId,
      uploadedByName: user.name,
    })

    await file.save()

    return NextResponse.json({
      success: true,
      file: {
        id: file._id.toString(),
        name: file.originalName,
        size: file.fileSize,
        type: file.mimeType,
        url: file.filePath,
        uploadedBy: file.uploadedByName,
        uploadedAt: file.uploadedAt.getTime(),
        downloadCount: file.downloadCount,
      },
      message: "File metadata saved successfully",
    })

  } catch (error) {
    console.error("Save file metadata error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}