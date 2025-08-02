import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/models/User"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export async function POST() {
  try {
    await connectDB()

    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = "testpassword123"

    // Test user creation
    const hashedPassword = await bcrypt.hash(testPassword, 12)
    const testUser = await User.create({
      name: "Test User",
      email: testEmail,
      password: hashedPassword,
      grade: "12",
      school: "Test School",
    })

    // Test JWT creation
    const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET || "fallback-secret", {
      expiresIn: "1h",
    })

    // Test JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as { userId: string }

    // Test password verification
    const isPasswordValid = await bcrypt.compare(testPassword, testUser.password)

    // Cleanup test user
    await User.findByIdAndDelete(testUser._id)

    return NextResponse.json({
      status: "success",
      tests: {
        userCreation: "✅ passed",
        jwtGeneration: "✅ passed",
        jwtVerification: decoded.userId === testUser._id.toString() ? "✅ passed" : "❌ failed",
        passwordHashing: isPasswordValid ? "✅ passed" : "❌ failed",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Auth test failed:", error)
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
