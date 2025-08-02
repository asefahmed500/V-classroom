import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"
import mongoose from "mongoose"

// Study session model for tracking
const StudySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyRoom", required: true },
  roomName: String,
  subject: String,
  joinedAt: { type: Date, required: true },
  leftAt: { type: Date, default: Date.now },
  duration: Number, // in minutes
  activitiesCompleted: {
    videoChat: { type: Boolean, default: false },
    whiteboard: { type: Boolean, default: false },
    notes: { type: Boolean, default: false },
    fileSharing: { type: Boolean, default: false },
    chat: { type: Boolean, default: false },
  },
  studyGoalsAchieved: Number,
  focusScore: Number, // 1-10 rating
})

const StudySession = mongoose.models.StudySession || mongoose.model("StudySession", StudySessionSchema)

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
    const { duration, activitiesCompleted, studyGoalsAchieved, focusScore } = await request.json()

    // Find room
    const room = await StudyRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Find participant
    const participantIndex = room.participants.findIndex(
      (p: any) => p.userId.toString() === userId
    )

    if (participantIndex === -1) {
      return NextResponse.json({ message: "Not a participant in this room" }, { status: 400 })
    }

    const participant = room.participants[participantIndex]

    // Save study session
    const studySession = new StudySession({
      userId,
      roomId,
      roomName: room.name,
      subject: room.subject,
      joinedAt: participant.joinedAt,
      leftAt: new Date(),
      duration: duration || Math.floor((Date.now() - participant.joinedAt.getTime()) / 60000),
      activitiesCompleted: activitiesCompleted || {
        videoChat: true,
        whiteboard: false,
        notes: false,
        fileSharing: false,
        chat: false,
      },
      studyGoalsAchieved: studyGoalsAchieved || 0,
      focusScore: focusScore || 5,
    })

    await studySession.save()

    // Remove participant from room or mark as inactive
    room.participants[participantIndex].isActive = false
    room.participants[participantIndex].leftAt = new Date()

    // If this was the host and there are other participants, transfer host
    if (participant.isHost && room.participants.length > 1) {
      const activeParticipants = room.participants.filter((p: any) => p.isActive && p.userId.toString() !== userId)
      if (activeParticipants.length > 0) {
        activeParticipants[0].isHost = true
        room.host = activeParticipants[0].userId
      }
    }

    // If no active participants, mark room as inactive
    const hasActiveParticipants = room.participants.some((p: any) => p.isActive)
    if (!hasActiveParticipants) {
      room.isActive = false
      room.endedAt = new Date()
    }

    await room.save()

    return NextResponse.json({
      success: true,
      studySession: {
        id: studySession._id,
        duration: studySession.duration,
        activitiesCompleted: studySession.activitiesCompleted,
        studyGoalsAchieved: studySession.studyGoalsAchieved,
        focusScore: studySession.focusScore,
      },
      message: "Left room successfully",
    })

  } catch (error) {
    console.error("Leave room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}