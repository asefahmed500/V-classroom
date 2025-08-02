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

    const { topic, subject, difficulty, questionCount = 5 } = await request.json()

    if (!topic || !subject) {
      return NextResponse.json({ error: "Topic and subject are required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `Generate ${questionCount} ${difficulty || "medium"} difficulty practice questions for high school students on the topic "${topic}" in ${subject}.

Include a mix of:
- Multiple choice questions (with 4 options and correct answer)
- Short answer questions
- Problem-solving questions (if applicable)

Format the response as JSON with this structure:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "Why this is correct"
    },
    {
      "type": "short_answer",
      "question": "Question text",
      "sample_answer": "Expected answer",
      "explanation": "Key points to include"
    }
  ]
}

Make questions engaging and educational for high school level.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      // Try to parse as JSON
      const questions = JSON.parse(text)
      return NextResponse.json(questions)
    } catch (parseError) {
      // If JSON parsing fails, return as plain text
      return NextResponse.json({
        questions: [
          {
            type: "text",
            content: text,
          },
        ],
      })
    }
  } catch (error) {
    console.error("Generate questions error:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
