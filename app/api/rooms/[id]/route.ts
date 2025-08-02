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

    // Get room data
    const room = await StudyRoom.findById(roomId)
      .populate("host", "name email")
      .populate("participants.userId", "name email")

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Format response
    const formattedRoom = {
      _id: room._id,
      name: room.name,
      subject: room.subject,
      description: room.description,
      roomType: room.roomType,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      roomCode: room.roomCode,
      host: {
        id: room.host._id,
        name: room.host.name,
        email: room.host.email,
      },
      participants: room.participants.map((p: any) => ({
        id: p.userId._id,
        name: p.userId.name,
        email: p.userId.email,
        isHost: p.isHost,
        joinedAt: p.joinedAt,
        isActive: p.isActive,
        videoEnabled: true,
        audioEnabled: true,
      })),
      isActive: room.isActive,
      createdAt: room.createdAt,
      settings: room.settings,
    }

    return NextResponse.json(formattedRoom)

  } catch (error) {
    console.error("Get room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const updates = await request.json()

    // Find room
    const room = await StudyRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Check if user is host
    if (room.host.toString() !== userId) {
      return NextResponse.json({ message: "Only host can update room" }, { status: 403 })
    }

    // Update room
    const updatedRoom = await StudyRoom.findByIdAndUpdate(
      roomId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).populate("host", "name email")
     .populate("participants.userId", "name email")

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: "Room updated successfully",
    })

  } catch (error) {
    console.error("Update room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if user is host
    if (room.host.toString() !== userId) {
      return NextResponse.json({ message: "Only host can delete room" }, { status: 403 })
    }

    // Delete room
    await StudyRoom.findByIdAndDelete(roomId)

    return NextResponse.json({
      success: true,
      message: "Room deleted successfully",
    })

  } catch (error) {
    console.error("Delete room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}