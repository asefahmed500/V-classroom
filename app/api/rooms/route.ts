import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"
import { User } from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const subject = searchParams.get("subject")
    const roomType = searchParams.get("roomType")
    const search = searchParams.get("search")

    // Build query
    const query: any = { isActive: true }
    
    if (subject) {
      query.subject = { $regex: subject, $options: "i" }
    }
    
    if (roomType) {
      query.roomType = roomType
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    // Get rooms with pagination
    const rooms = await StudyRoom.find(query)
      .populate("host", "name email")
      .populate("participants.userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const total = await StudyRoom.countDocuments(query)

    // Format response
    const formattedRooms = rooms.map((room) => ({
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
      participants: room.participants.length,
      participantsList: room.participants.map((p: any) => ({
        id: p.userId._id,
        name: p.userId.name,
        joinedAt: p.joinedAt,
        isHost: p.isHost,
        isActive: p.isActive,
      })),
      isActive: room.isActive,
      createdAt: room.createdAt,
      settings: room.settings,
    }))

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error("Get rooms error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const {
      name,
      subject,
      description,
      roomType,
      maxParticipants,
      isPrivate,
      settings,
    } = await request.json()

    // Validation
    if (!name || !subject) {
      return NextResponse.json(
        { message: "Name and subject are required" },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { message: "Room name must be less than 100 characters" },
        { status: 400 }
      )
    }

    if (subject.length > 50) {
      return NextResponse.json(
        { message: "Subject must be less than 50 characters" },
        { status: 400 }
      )
    }

    // Create room
    const room = new StudyRoom({
      name: name.trim(),
      subject: subject.trim(),
      description: description?.trim(),
      roomType: roomType || "discussion",
      maxParticipants: maxParticipants || 8,
      isPrivate: isPrivate || false,
      host: userId,
      participants: [
        {
          userId: userId,
          isHost: true,
          joinedAt: new Date(),
        },
      ],
      settings: {
        allowScreenShare: settings?.allowScreenShare ?? true,
        allowFileSharing: settings?.allowFileSharing ?? true,
        allowChat: settings?.allowChat ?? true,
        allowWhiteboard: settings?.allowWhiteboard ?? true,
        recordSession: settings?.recordSession ?? false,
      },
    })

    await room.save()

    // Populate the response
    await room.populate("host", "name email")
    await room.populate("participants.userId", "name email")

    return NextResponse.json({
      success: true,
      room: {
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
        participants: room.participants.length,
        participantsList: room.participants.map((p: any) => ({
          id: p.userId._id,
          name: p.userId.name,
          joinedAt: p.joinedAt,
          isHost: p.isHost,
          isActive: p.isActive,
        })),
        isActive: room.isActive,
        createdAt: room.createdAt,
        settings: room.settings,
      },
      message: "Room created successfully",
    })

  } catch (error) {
    console.error("Create room error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}