import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { User } from "@/models/User"
import mongoose from "mongoose"

// Study session model for stats calculation
const StudySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyRoom", required: true },
  roomName: String,
  subject: String,
  joinedAt: { type: Date, required: true },
  leftAt: { type: Date, default: Date.now },
  duration: Number, // in minutes
  activitiesCompleted: {
    videoChat: { type: Boolean, default: false },
    whiteboard: { type: Boolean, default: false },
    notes: { type: Boolean, default: false },
    fileSharing: { type: Boolean, default: false },
    chat: { type: Boolean, default: false },
  },
  studyGoalsAchieved: Number,
  focusScore: Number, // 1-10 rating
})

const StudySession = mongoose.models.StudySession || mongoose.model("StudySession", StudySessionSchema)

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Calculate stats from study sessions
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get study sessions for calculations
    const [weekSessions, monthSessions, allSessions] = await Promise.all([
      StudySession.find({
        userId,
        joinedAt: { $gte: weekStart }
      }),
      StudySession.find({
        userId,
        joinedAt: { $gte: monthStart }
      }),
      StudySession.find({ userId }).sort({ joinedAt: -1 }).limit(30)
    ])

    // Calculate total study time this week (in hours)
    const totalStudyTimeWeek = weekSessions.reduce((total, session) => {
      return total + (session.duration || 0)
    }, 0) / 60

    // Calculate rooms joined this month
    const roomsJoinedMonth = monthSessions.length

    // Calculate study streak (consecutive days with study sessions)
    let studyStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      
      const hasSessionOnDate = allSessions.some(session => {
        const sessionDate = new Date(session.joinedAt)
        sessionDate.setHours(0, 0, 0, 0)
        return sessionDate.getTime() === checkDate.getTime()
      })

      if (hasSessionOnDate) {
        studyStreak++
      } else if (i > 0) { // Allow for today to not have a session yet
        break
      }
    }

    // Calculate average focus score
    const sessionsWithFocus = allSessions.filter(s => s.focusScore > 0)
    const averageFocusScore = sessionsWithFocus.length > 0 
      ? sessionsWithFocus.reduce((sum, s) => sum + s.focusScore, 0) / sessionsWithFocus.length
      : 0

    // Get favorite subjects
    const subjectCounts = allSessions.reduce((acc, session) => {
      if (session.subject) {
        acc[session.subject] = (acc[session.subject] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const favoriteSubjects = Object.entries(subjectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([subject]) => subject)

    // Update user stats in database
    user.studyStats = {
      totalStudyTime: Math.round(totalStudyTimeWeek * 10) / 10,
      roomsJoined: roomsJoinedMonth,
      studyStreak: studyStreak,
    }
    await user.save()

    return NextResponse.json({
      success: true,
      stats: {
        totalStudyTime: Math.round(totalStudyTimeWeek * 10) / 10,
        roomsJoined: roomsJoinedMonth,
        studyStreak: studyStreak,
        averageFocusScore: Math.round(averageFocusScore * 10) / 10,
        favoriteSubjects,
        totalSessions: allSessions.length,
        totalStudyTimeAllTime: Math.round(allSessions.reduce((total, session) => {
          return total + (session.duration || 0)
        }, 0) / 60 * 10) / 10,
      }
    })

  } catch (error) {
    console.error("Get user stats error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}