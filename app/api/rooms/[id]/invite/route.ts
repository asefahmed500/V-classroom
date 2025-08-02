import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { StudyRoom } from "@/models/StudyRoom"
import { User } from "@/models/User"
import { sendEmail, generateInvitationEmail } from "@/lib/email"

export async function POST(
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
    const { email, message } = await request.json()

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Invalid email format" }, { status: 400 })
    }

    // Find the room
    const room = await StudyRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Find the inviter
    const inviter = await User.findById(userId).select("name email")
    if (!inviter) {
      return NextResponse.json({ message: "Inviter not found" }, { status: 404 })
    }

    // Check if user is already in the room
    const isAlreadyParticipant = room.participants.some(
      (p: any) => p.email === email
    )

    if (isAlreadyParticipant) {
      return NextResponse.json(
        { message: "User is already a participant" },
        { status: 400 }
      )
    }

    // Generate invitation link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL}/rooms/${roomId}/join?invite=true&email=${encodeURIComponent(email)}`

    // Prepare email data
    const emailData = {
      inviterName: inviter.name,
      roomName: room.name,
      roomSubject: room.subject,
      inviteLink: inviteLink,
      message: message || `Join me in studying ${room.subject}!`,
    }

    // Generate email content
    const { html, text } = generateInvitationEmail(emailData)

    // Send email invitation
    const emailResult = await sendEmail({
      to: email,
      subject: `${inviter.name} invited you to join "${room.name}" study room`,
      html,
      text,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { message: "Failed to send invitation email", error: emailResult.error },
        { status: 500 }
      )
    }

    // Store invitation in database for tracking
    const invitationData = {
      roomId: roomId,
      roomName: room.name,
      roomSubject: room.subject,
      inviterName: inviter.name,
      inviterEmail: inviter.email,
      invitedEmail: email,
      inviteLink: inviteLink,
      message: message || `Join me in studying ${room.subject}!`,
      invitedAt: new Date(),
      emailSent: true,
      messageId: emailResult.messageId,
    }

    return NextResponse.json({
      success: true,
      invitation: invitationData,
      message: "Invitation sent successfully",
    })

  } catch (error) {
    console.error("Create invitation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
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

    // Find the room with participants
    const room = await StudyRoom.findById(roomId)
      .populate("participants.userId", "name email")

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    // Generate shareable room link
    const shareableLink = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL}/rooms/${roomId}/join`
    
    return NextResponse.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        subject: room.subject,
        roomCode: room.roomCode,
        shareableLink: shareableLink,
        participants: room.participants.map((p: any) => ({
          id: p.userId._id,
          name: p.userId.name,
          email: p.userId.email,
          joinedAt: p.joinedAt,
          isHost: p.isHost,
        })),
      },
    })

  } catch (error) {
    console.error("Get room invitation info error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}