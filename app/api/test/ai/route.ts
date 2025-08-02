import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST() {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("your-")) {
      throw new Error("Gemini API key not configured")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const result = await model.generateContent("Say 'AI test successful' if you can read this.")
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      status: "success",
      aiResponse: text,
      test: text.toLowerCase().includes("successful") ? "✅ passed" : "⚠️ partial",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("AI test failed:", error)
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
