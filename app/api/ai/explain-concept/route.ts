import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { verifyToken } from "@/lib/auth"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request)
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { concept, subject, level = "high school" } = await request.json()

    if (!concept) {
      return NextResponse.json({ error: "Concept is required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `Explain the concept "${concept}" ${subject ? `in ${subject}` : ""} for ${level} students.

Please provide:
1. A clear, simple definition
2. Key points or components
3. Real-world examples or applications
4. Common misconceptions to avoid
5. Tips for remembering or understanding this concept

Make the explanation engaging and easy to understand for students at this level.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const explanation = response.text()

    return NextResponse.json({
      concept,
      subject,
      level,
      explanation,
    })
  } catch (error) {
    console.error("Explain concept error:", error)
    return NextResponse.json({ error: "Failed to explain concept" }, { status: 500 })
  }
}
