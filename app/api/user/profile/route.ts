import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { User } from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const user = await User.findById(userId).select("-password")
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, email, school, grade, bio, preferences } = await request.json()

    // Validate required fields
    if (!name || !email || !school || !grade) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const updateData: any = {
      name: name.trim(),
      email: email.trim(),
      school: school.trim(),
      grade,
    }

    if (bio !== undefined) {
      updateData.bio = bio.trim()
    }

    if (preferences) {
      updateData.preferences = preferences
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password")

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      user,
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}