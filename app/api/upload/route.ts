import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"

// File model for database storage
import mongoose from "mongoose"

const FileSchema = new mongoose.Schema({
  originalName: String,
  fileName: String,
  filePath: String,
  fileSize: Number,
  mimeType: String,
  roomId: String,
  uploadedBy: String,
  uploadedAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 },
})

const FileModel = mongoose.models.File || mongoose.model("File", FileSchema)

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const roomId = formData.get("roomId") as string

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 })
    }

    if (!roomId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 })
    }

    // Check file size (50MB limit)
    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE || "52428800") // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Check file type
    const allowedTypes = process.env.UPLOAD_ALLOWED_TYPES?.split(",") || [
      "pdf", "doc", "docx", "txt", "png", "jpg", "jpeg", "gif", "mp4", "mp3"
    ]
    
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { message: "File type not allowed" },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", roomId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = path.join(uploadsDir, fileName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Save file metadata to database
    const fileDoc = new FileModel({
      originalName: file.name,
      fileName: fileName,
      filePath: `/uploads/${roomId}/${fileName}`,
      fileSize: file.size,
      mimeType: file.type,
      roomId: roomId,
      uploadedBy: userId,
      uploadedAt: new Date(),
      downloadCount: 0,
    })

    await fileDoc.save()

    // Return file information
    return NextResponse.json({
      success: true,
      fileId: fileDoc._id,
      fileName: file.name,
      fileUrl: `/uploads/${roomId}/${fileName}`,
      fileSize: file.size,
      mimeType: file.type,
    })

  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ message: "Room ID is required" }, { status: 400 })
    }

    // Get files for the room
    const files = await FileModel.find({ roomId })
      .sort({ uploadedAt: -1 })
      .populate("uploadedBy", "name")

    return NextResponse.json({
      success: true,
      files: files.map(file => ({
        id: file._id,
        name: file.originalName,
        size: file.fileSize,
        type: file.mimeType,
        url: file.filePath,
        uploadedBy: file.uploadedBy?.name || "Unknown",
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