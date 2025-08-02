import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { StudyRoom } from "@/models/StudyRoom"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Create a test room
    const testRoom = new StudyRoom({
      name: "Test Room - " + new Date().toLocaleTimeString(),
      subject: "Testing",
      description: "This is a test room created by the system test",
      roomType: "discussion",
      maxParticipants: 4,
      isPrivate: false,
      host: "000000000000000000000000", // Dummy ObjectId for testing
      participants: [],
      settings: {
        allowScreenShare: true,
        allowFileSharing: true,
        allowChat: true,
        allowWhiteboard: true,
        recordSession: false,
      },
    })

    await testRoom.save()

    // Clean up - delete the test room after a short delay
    setTimeout(async () => {
      try {
        await StudyRoom.findByIdAndDelete(testRoom._id)
        console.log("Test room cleaned up:", testRoom._id)
      } catch (error) {
        console.error("Failed to clean up test room:", error)
      }
    }, 30000) // Delete after 30 seconds

    return NextResponse.json({
      success: true,
      message: "Test room created successfully",
      room: {
        id: testRoom._id,
        name: testRoom.name,
        subject: testRoom.subject,
        roomType: testRoom.roomType,
        maxParticipants: testRoom.maxParticipants,
        isPrivate: testRoom.isPrivate,
        createdAt: testRoom.createdAt,
      },
    })

  } catch (error) {
    console.error("Test room creation error:", error)
    return NextResponse.json(
      { message: "Failed to create test room", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}