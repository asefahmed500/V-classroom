import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { User } from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get user data
    const user = await User.findById(userId).select("-password")
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      grade: user.grade,
      school: user.school,
      bio: user.bio,
      avatar: user.avatar,
      preferences: user.preferences,
      studyStats: user.studyStats,
      createdAt: user.createdAt,
    })

  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}