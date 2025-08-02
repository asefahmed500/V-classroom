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

export async function POST(
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

    // Find file and increment download count
    const file = await File.findById(fileId)
    if (!file) {
      return NextResponse.json({ message: "File not found" }, { status: 404 })
    }

    // Increment download count
    file.downloadCount += 1
    await file.save()

    return NextResponse.json({
      success: true,
      downloadCount: file.downloadCount,
      message: "Download tracked successfully",
    })

  } catch (error) {
    console.error("Track download error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}