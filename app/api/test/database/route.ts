import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/models/User"
import { StudyRoom } from "@/models/StudyRoom"

export async function GET() {
  try {
    console.log("Testing database connection...")
    await connectDB()

    // Test basic operations
    const userCount = await User.countDocuments()
    const roomCount = await StudyRoom.countDocuments()

    // Test index creation
    const userIndexes = await User.collection.getIndexes()
    const roomIndexes = await StudyRoom.collection.getIndexes()

    return NextResponse.json({
      status: "success",
      database: "connected",
      collections: {
        users: { count: userCount, indexes: Object.keys(userIndexes).length },
        rooms: { count: roomCount, indexes: Object.keys(roomIndexes).length },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database test failed:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
