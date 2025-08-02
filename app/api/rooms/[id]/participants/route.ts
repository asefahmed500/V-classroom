import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const roomId = params.id

    // Get room with participants
    const room = await StudyRoom.findById(roomId)
      .populate("participants.userId", "name email")

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    const participants = room.participants.map((p: any) => ({
      id: p.userId._id,
      name: p.userId.name,
      email: p.userId.email,
      isHost: p.isHost,
      joinedAt: p.joinedAt,
      isActive: p.isActive,
      videoEnabled: true,
      audioEnabled: true,
    }))

    return NextResponse.json({
      success: true,
      participants,
    })

  } catch (error) {
    console.error("Get participants error:", error)
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

    // Find room
    const room = await StudyRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json({ message: "Room is full" }, { status: 400 })
    }

    // Check if user is already in room
    const existingParticipant = room.participants.find(
      (p: any) => p.userId.toString() === userId
    )

    if (existingParticipant) {
      // Update existing participant to active
      existingParticipant.isActive = true
      existingParticipant.joinedAt = new Date()
    } else {
      // Add new participant
      room.participants.push({
        userId: userId,
        isHost: false,
        joinedAt: new Date(),
        isActive: true,
      })
    }

    await room.save()

    // Populate and return updated participants
    await room.populate("participants.userId", "name email")

    const participants = room.participants.map((p: any) => ({
      id: p.userId._id,
      name: p.userId.name,
      email: p.userId.email,
      isHost: p.isHost,
      joinedAt: p.joinedAt,
      isActive: p.isActive,
      videoEnabled: true,
      audioEnabled: true,
    }))

    return NextResponse.json({
      success: true,
      participants,
      message: "Joined room successfully",
    })

  } catch (error) {
    console.error("Join room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}