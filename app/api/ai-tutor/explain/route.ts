import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { concept, subject, roomId, userId, level = 'intermediate' } = await request.json()

    if (!concept || !subject) {
      return NextResponse.json(
        { error: 'Concept and subject are required' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const levelPrompts = {
      beginner: "Explain this concept in very simple terms, as if teaching a complete beginner. Use everyday analogies and avoid technical jargon.",
      intermediate: "Provide a clear explanation suitable for someone with basic knowledge. Include some technical details but keep it accessible.",
      advanced: "Give a comprehensive, detailed explanation with technical depth. Include advanced concepts and connections to related topics."
    }

    const prompt = `You are an expert educator in ${subject}. ${levelPrompts[level as keyof typeof levelPrompts]}

Concept to explain: "${concept}"
Subject context: ${subject}
Explanation level: ${level}

Please provide a structured explanation that includes:
1. **Definition**: What is this concept?
2. **Key Components**: Break down the main parts or elements
3. **How it Works**: Explain the process or mechanism
4. **Real-world Examples**: Provide concrete examples or applications
5. **Common Misconceptions**: Address typical misunderstandings
6. **Related Concepts**: Connect to other important topics in ${subject}

Make your explanation engaging, clear, and educational. Use formatting like bullet points, numbered lists, and emphasis where helpful.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const explanation = response.text()

    return NextResponse.json({
      success: true,
      explanation,
      concept,
      subject,
      level,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Explanation generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    )
  }
}