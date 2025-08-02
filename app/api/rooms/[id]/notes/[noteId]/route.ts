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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { noteId } = params
    const { title, content } = await request.json()

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      )
    }

    // Find note
    const note = await Note.findById(noteId)
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 })
    }

    // Check if user can edit (only creator can edit)
    if (note.createdBy.toString() !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Update note
    note.title = title.trim()
    note.content = content.trim()
    note.updatedAt = new Date()

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
      message: "Note updated successfully",
    })

  } catch (error) {
    console.error("Update note error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { noteId } = params

    // Find note
    const note = await Note.findById(noteId)
    if (!note) {
      return NextResponse.json({ message: "Note not found" }, { status: 404 })
    }

    // Check if user can delete (only creator can delete)
    if (note.createdBy.toString() !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Delete note
    await Note.findByIdAndDelete(noteId)

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    })

  } catch (error) {
    console.error("Delete note error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}