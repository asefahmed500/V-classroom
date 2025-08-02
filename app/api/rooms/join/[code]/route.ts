import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { StudyRoom } from "@/models/StudyRoom"

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await connectDB()

    const roomCode = params.code.toUpperCase()

    // Find room by code
    const room = await StudyRoom.findOne({ 
      roomCode, 
      isActive: true 
    })

    if (!room) {
      return NextResponse.json(
        { message: "Room not found or inactive" },
        { status: 404 }
      )
    }

    // Check if room is full
    const activeParticipants = room.participants.filter((p: any) => p.isActive)
    if (activeParticipants.length >= room.maxParticipants) {
      return NextResponse.json(
        { message: "Room is full" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      roomId: room._id,
      roomName: room.name,
      subject: room.subject,
      participants: activeParticipants.length,
      maxParticipants: room.maxParticipants,
    })

  } catch (error) {
    console.error("Join room by code error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}