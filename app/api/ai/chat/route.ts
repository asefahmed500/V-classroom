import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `You are an AI study assistant for high school students. You help with:
    - Explaining complex concepts in simple terms
    - Generating practice questions
    - Providing study tips and techniques
    - Helping with homework across all subjects
    - Motivating students to stay focused

    Student question: ${message}

    Please provide a helpful, encouraging, and educational response.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("AI chat error:", error)
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 })
  }
}
