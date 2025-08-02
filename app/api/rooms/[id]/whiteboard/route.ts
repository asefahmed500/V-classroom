import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import mongoose from "mongoose"

// Whiteboard model
const WhiteboardSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  paths: [{
    id: String,
    points: [{ x: Number, y: Number }],
    color: String,
    width: Number,
    tool: String,
    userId: String,
    timestamp: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now },
})

const Whiteboard = mongoose.models.Whiteboard || mongoose.model("Whiteboard", WhiteboardSchema)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const roomId = params.id

    // Get whiteboard data for the room
    const whiteboard = await Whiteboard.findOne({ roomId })

    return NextResponse.json({
      success: true,
      paths: whiteboard?.paths || [],
    })

  } catch (error) {
    console.error("Get whiteboard error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const roomId = params.id
    const { paths } = await request.json()

    // Update or create whiteboard data
    await Whiteboard.findOneAndUpdate(
      { roomId },
      { 
        roomId,
        paths,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success: true,
      message: "Whiteboard saved successfully",
    })

  } catch (error) {
    console.error("Save whiteboard error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}