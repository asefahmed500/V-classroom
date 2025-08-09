import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { subject, roomId, userId, difficulty = 'medium', questionCount = 5 } = await request.json()

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `Create an interactive quiz for ${subject} with ${questionCount} questions at ${difficulty} difficulty level.

Format the quiz as follows:
1. Start with a brief introduction
2. For each question, provide:
   - Question number and text
   - 4 multiple choice options (A, B, C, D)
   - Mark the correct answer
3. End with instructions for the student

Make the questions engaging and educational. Cover different aspects of ${subject}. 

Example format:
🧠 **${subject} Quiz - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level**

Welcome to your interactive quiz! Answer each question and I'll provide immediate feedback.

**Question 1:** [Question text]
A) Option A
B) Option B  
C) Option C
D) Option D

*Reply with the letter of your answer (A, B, C, or D)*

Continue this format for all ${questionCount} questions.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const quiz = response.text()

    return NextResponse.json({
      success: true,
      quiz,
      subject,
      difficulty,
      questionCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}