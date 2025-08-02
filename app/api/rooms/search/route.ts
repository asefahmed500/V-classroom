import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { StudyRoom } from "@/models/StudyRoom"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const subject = searchParams.get("subject")
    const roomType = searchParams.get("type")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const filter: any = { isActive: true, isPrivate: false }

    if (query) {
      filter.$or = [{ name: { $regex: query, $options: "i" } }, { description: { $regex: query, $options: "i" } }]
    }

    if (subject) {
      filter.subject = subject
    }

    if (roomType) {
      filter.roomType = roomType
    }

    const rooms = await StudyRoom.find(filter)
      .populate("participants.user", "name")
      .populate("host", "name")
      .sort({ createdAt: -1 })
      .limit(limit)

    const formattedRooms = rooms.map((room) => ({
      _id: room._id,
      name: room.name,
      subject: room.subject,
      description: room.description,
      roomType: room.roomType,
      participants: room.participants.length,
      maxParticipants: room.maxParticipants,
      host: room.host.name,
      isActive: room.isActive,
      createdAt: room.createdAt,
    }))

    return NextResponse.json(formattedRooms)
  } catch (error) {
    console.error("Search rooms error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
