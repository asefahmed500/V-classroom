import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/models/User"
import { sendEmail, generateWelcomeEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { name, email, password, grade, school } = await request.json()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      grade,
      school,
    })

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" })

    // Send welcome email
    try {
      const { html, text } = generateWelcomeEmail({
        userName: name,
        loginLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      })

      await sendEmail({
        to: email,
        subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}! 🎓`,
        html,
        text,
      })
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
      // Don't fail the signup if email fails
    }

    const response = NextResponse.json({ 
      message: "Account created successfully! Welcome to Virtual Study Rooms!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      }
    }, { status: 201 })

    // Set HTTP-only cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    return response
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
