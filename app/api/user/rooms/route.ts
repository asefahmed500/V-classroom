import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Find rooms where user is a participant or host
    const rooms = await StudyRoom.find({
      $or: [
        { host: userId },
        { "participants.userId": userId }
      ]
    })
    .populate("host", "name email")
    .sort({ createdAt: -1 })

    const formattedRooms = rooms.map((room) => {
      const isHost = room.host._id.toString() === userId
      return {
        _id: room._id,
        name: room.name,
        subject: room.subject,
        roomType: room.roomType,
        participants: room.participants.length,
        maxParticipants: room.maxParticipants,
        isHost,
        createdAt: room.createdAt,
        lastActive: room.updatedAt || room.createdAt,
        isActive: room.isActive,
      }
    })

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
    })

  } catch (error) {
    console.error("Get user rooms error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}