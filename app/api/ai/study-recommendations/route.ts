import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/models/User"
import { StudySession } from "@/models/StudySession"
import { verifyToken } from "@/lib/auth"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const user = await User.findById(userId)
    const recentSessions = await StudySession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("roomId", "subject")

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const studyData = {
      grade: user.grade,
      totalStudyTime: user.studyStats.totalStudyTime,
      studyStreak: user.studyStats.studyStreak,
      recentSubjects: recentSessions.map((session: any) => session.roomId?.subject).filter(Boolean),
      averageSessionLength: recentSessions.length
        ? recentSessions.reduce((acc: number, session: any) => acc + session.duration, 0) / recentSessions.length
        : 0,
    }

    const prompt = `Based on this high school student's study data, provide personalized recommendations:

Student Profile:
- Grade: ${studyData.grade}
- Total Study Time: ${studyData.totalStudyTime} hours
- Current Study Streak: ${studyData.studyStreak} days
- Recent Subjects: ${studyData.recentSubjects.join(", ")}
- Average Session Length: ${Math.round(studyData.averageSessionLength)} minutes

Please provide:
1. Study schedule recommendations
2. Subject-specific tips based on their recent activity
3. Motivation strategies to maintain/improve their study streak
4. Suggestions for optimal study session lengths
5. Recommended study techniques for their grade level

Keep recommendations practical and encouraging for a high school student.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const recommendations = response.text()

    return NextResponse.json({ recommendations, studyData })
  } catch (error) {
    console.error("Study recommendations error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
