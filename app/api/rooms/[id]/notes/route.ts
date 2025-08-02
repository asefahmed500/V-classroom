import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import mongoose from "mongoose"

// Note model
const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  roomId: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdByName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const Note = mongoose.models.Note || mongoose.model("Note", NoteSchema)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const roomId = params.id

    // Get notes for the room
    const notes = await Note.find({ roomId })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      notes: notes.map(note => ({
        id: note._id.toString(),
        title: note.title,
        content: note.content,
        createdBy: note.createdBy._id.toString(),
        createdByName: note.createdByName,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      }))
    })

  } catch (error) {
    console.error("Get notes error:", error)
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
    const { title, content } = await request.json()

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        { message: "Title must be less than 200 characters" },
        { status: 400 }
      )
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { message: "Content must be less than 10,000 characters" },
        { status: 400 }
      )
    }

    // Get user info
    const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
      name: String,
      email: String,
    }))
    
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Create note
    const note = new Note({
      title: title.trim(),
      content: content.trim(),
      roomId,
      createdBy: userId,
      createdByName: user.name,
    })

    await note.save()

    return NextResponse.json({
      success: true,
      note: {
        id: note._id.toString(),
        title: note.title,
        content: note.content,
        createdBy: note.createdBy.toString(),
        createdByName: note.createdByName,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
      message: "Note created successfully",
    })

  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}