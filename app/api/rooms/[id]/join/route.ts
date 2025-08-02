import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"
import { User } from "@/models/User"

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

    // Find the room
    const room = await StudyRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json({ message: "Room is full" }, { status: 400 })
    }

    // Check if user is already in the room
    const isAlreadyParticipant = room.participants.some(
      (p: any) => p.userId.toString() === userId
    )

    if (isAlreadyParticipant) {
      return NextResponse.json({ message: "Already in room" }, { status: 400 })
    }

    // Add user to room participants
    room.participants.push({
      userId: userId,
      joinedAt: new Date(),
      isHost: false,
    })

    // Update user's study stats
    await User.findByIdAndUpdate(userId, {
      $inc: { "studyStats.roomsJoined": 1 }
    })

    await room.save()

    return NextResponse.json({
      success: true,
      message: "Successfully joined the room",
      room: {
        id: room._id,
        name: room.name,
        subject: room.subject,
        participantCount: room.participants.length,
      },
    })

  } catch (error) {
    console.error("Join room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}