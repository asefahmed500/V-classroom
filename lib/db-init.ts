import { connectDB } from "./mongodb"
import { User } from "@/models/User"
import { StudyRoom } from "@/models/StudyRoom"
import { RoomFile } from "@/models/RoomFile"
import { RoomNote } from "@/models/RoomNote"
import { WhiteboardData } from "@/models/WhiteboardData"
import { StudySession } from "@/models/StudySession"

export async function initializeDatabase() {
  try {
    await connectDB()

    // Create indexes for better performance
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await StudyRoom.collection.createIndex({ isActive: 1 })
    await StudyRoom.collection.createIndex({ subject: 1 })
    await StudyRoom.collection.createIndex({ createdAt: -1 })
    await StudyRoom.collection.createIndex({ roomCode: 1 }, { unique: true, sparse: true })

    await RoomFile.collection.createIndex({ roomId: 1 })
    await RoomNote.collection.createIndex({ roomId: 1 })
    await WhiteboardData.collection.createIndex({ roomId: 1 }, { unique: true })
    await StudySession.collection.createIndex({ userId: 1 })
    await StudySession.collection.createIndex({ createdAt: -1 })

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
  }
}
