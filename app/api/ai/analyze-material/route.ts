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

    const { content, subject, analysisType } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    let prompt = ""

    switch (analysisType) {
      case "summary":
        prompt = `Please provide a concise summary of this ${subject} material for high school students:

${content}

Focus on key concepts and main ideas.`
        break

      case "questions":
        prompt = `Generate 5 practice questions based on this ${subject} material for high school students:

${content}

Include a mix of multiple choice, short answer, and essay questions with varying difficulty levels.`
        break

      case "concepts":
        prompt = `Identify and explain the key concepts from this ${subject} material for high school students:

${content}

List each concept with a brief, clear explanation.`
        break

      case "study-tips":
        prompt = `Provide specific study tips and techniques for mastering this ${subject} material:

${content}

Include memory techniques, practice strategies, and ways to connect concepts.`
        break

      default:
        prompt = `Analyze this ${subject} material and provide helpful insights for high school students:

${content}`
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ analysis: text, type: analysisType })
  } catch (error) {
    console.error("AI analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze material" }, { status: 500 })
  }
}
