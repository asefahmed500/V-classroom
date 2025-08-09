import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { message, prompt, context, conversationHistory } = await request.json()
    
    const userMessage = message || prompt

    if (!userMessage?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      )
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })

    // Build comprehensive context
    let contextPrompt = `You are an advanced AI study assistant in a virtual collaborative study room. Your role is to:

1. Help students understand complex concepts across all subjects
2. Provide study strategies and learning techniques
3. Assist with homework, assignments, and projects
4. Facilitate group learning and collaboration
5. Offer motivational support and study tips
6. Answer academic questions with clear explanations
7. Help with file sharing and collaboration tasks

Current Session Context:
- Room: ${context?.roomName || 'Study Room'}
- Participants: ${context?.participants || context?.users || 1} students
- Current Activity: ${context?.currentTab || context?.currentActivity || 'general study'}
- User: ${session?.user?.name || 'Student'}
- Files in room: ${context?.files?.map((f: any) => `${f.name} (${f.type})`).join(', ') || 'None'}

Guidelines:
- Be encouraging, supportive, and educational
- Provide clear, step-by-step explanations when needed
- Use examples and analogies to clarify complex concepts
- Suggest collaborative activities when appropriate
- Keep responses focused, helpful, and concise
- If asked about non-academic topics, gently redirect to study-related content
- For file sharing questions, provide practical collaboration advice

`

    // Add conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      contextPrompt += `\nRecent conversation:\n`
      conversationHistory.slice(-5).forEach((msg: any) => {
        contextPrompt += `${msg.type === 'user' ? 'Student' : 'AI'}: ${msg.message}\n`
      })
    }

    contextPrompt += `\nCurrent question: ${userMessage}`

    const result = await model.generateContent(contextPrompt)
    const response = await result.response
    const text = response.text()

    // Log usage for analytics
    if (session?.user?.id) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            event: 'ai_assistant_query',
            data: {
              roomId: context?.roomId,
              messageLength: userMessage.length,
              responseLength: text.length,
              timestamp: new Date().toISOString()
            }
          })
        }).catch(() => {}) // Ignore analytics errors
      } catch (analyticsError) {
        console.error('Analytics tracking failed:', analyticsError)
      }
    }

    return NextResponse.json({
      response: text,
      timestamp: new Date().toISOString(),
      usage: {
        promptTokens: userMessage.length,
        completionTokens: text.length
      }
    })

  } catch (error: any) {
    console.error('AI Assistant error:', error)
    
    // Handle specific API errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service is not configured properly' },
        { status: 503 }
      )
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return NextResponse.json(
        { error: 'AI service is temporarily unavailable due to high demand. Please try again in a moment.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { 
        response: 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment, or feel free to ask your question in a different way.',
        fallback: true,
        timestamp: new Date().toISOString()
      },
      { status: 200 } // Return 200 with fallback message instead of error
    )
  }
}