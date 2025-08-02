import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { unlink } from "fs/promises"
import path from "path"
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params

    // Find file
    const file = await File.findById(fileId)
    if (!file) {
      return NextResponse.json({ message: "File not found" }, { status: 404 })
    }

    // Check if user can delete (only uploader can delete)
    if (file.uploadedBy.toString() !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Delete file from filesystem
    try {
      const fullPath = path.join(process.cwd(), "public", file.filePath)
      await unlink(fullPath)
    } catch (error) {
      console.error("Failed to delete file from filesystem:", error)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await File.findByIdAndDelete(fileId)

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    })

  } catch (error) {
    console.error("Delete file error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}