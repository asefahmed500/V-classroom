import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { roomCode } = await request.json()

    if (!roomCode) {
      return NextResponse.json({ message: "Room code is required" }, { status: 400 })
    }

    // Find room by code
    const room = await StudyRoom.findOne({ 
      roomCode: roomCode.toUpperCase(),
      isActive: true 
    })

    if (!room) {
      return NextResponse.json({ message: "Invalid room code" }, { status: 404 })
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
      return NextResponse.json({
        success: true,
        room: {
          _id: room._id,
          name: room.name,
          subject: room.subject,
        },
        message: "Already in room",
      })
    }

    return NextResponse.json({
      success: true,
      room: {
        _id: room._id,
        name: room.name,
        subject: room.subject,
        roomType: room.roomType,
        participants: room.participants.length,
        maxParticipants: room.maxParticipants,
      },
      message: "Room found",
    })

  } catch (error) {
    console.error("Join by code error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}