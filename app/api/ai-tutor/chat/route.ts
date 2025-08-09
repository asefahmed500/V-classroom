import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, subject, roomId, userId, userName, chatHistory, context } = body

    // Handle both formats - direct message or nested in body
    const messageText = message || body.content || ''

    if (!messageText || !messageText.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Simulate AI tutor responses based on the message content
    const responses = [
      "That's a great question! Let me help you understand this concept better.",
      "I can see you're working on this topic. Here's a helpful explanation...",
      "Based on what you've shared, I think the key point to understand is...",
      "Let me break this down into simpler steps for you.",
      "This is a common area where students need extra help. Here's my approach...",
      "I notice you're studying this subject. Would you like me to provide some practice problems?",
      "That's an interesting point! Let me elaborate on that concept.",
      "I can help you with that. Here's what you need to know...",
      "Great question! This relates to several important concepts we should cover.",
      "Let me provide you with a clear explanation and some examples."
    ]

    // Simple keyword-based responses for more relevant answers
    const lowerMessage = messageText.toLowerCase()
    let response = responses[Math.floor(Math.random() * responses.length)]

    // Add subject-specific context if provided
    if (subject) {
      response = `Great question about ${subject}! ` + response
    }

    if (lowerMessage.includes('math') || lowerMessage.includes('calculate') || lowerMessage.includes('equation')) {
      response = "I'd be happy to help you with math! Can you share the specific problem or concept you're working on? I can walk you through the steps."
    } else if (lowerMessage.includes('science') || lowerMessage.includes('physics') || lowerMessage.includes('chemistry')) {
      response = "Science is fascinating! What specific topic are you studying? I can help explain concepts, provide examples, or suggest experiments."
    } else if (lowerMessage.includes('history') || lowerMessage.includes('historical')) {
      response = "History helps us understand the world today. What period or event are you studying? I can provide context and key insights."
    } else if (lowerMessage.includes('english') || lowerMessage.includes('writing') || lowerMessage.includes('essay')) {
      response = "Writing is a valuable skill! Are you working on an essay, analyzing literature, or improving your grammar? I can guide you through the process."
    } else if (lowerMessage.includes('help') || lowerMessage.includes('explain') || lowerMessage.includes('understand')) {
      response = "I'm here to help! Please share more details about what you're trying to understand, and I'll provide a clear explanation with examples."
    } else if (lowerMessage.includes('study') || lowerMessage.includes('learn')) {
      response = "Effective studying is key to success! What subject are you focusing on? I can suggest study strategies and help clarify difficult concepts."
    }

    // Add context-aware responses if context is provided
    if (context) {
      if (context.files && context.files.length > 0) {
        response += ` I see you have ${context.files.length} file(s) uploaded. I can help analyze or explain content from your materials.`
      }
      if (context.subject) {
        response += ` Since you're studying ${context.subject}, I can provide subject-specific guidance.`
      }
    }

    return NextResponse.json({
      response: response,
      timestamp: new Date().toISOString(),
      subject: subject || null,
      roomId: roomId || null,
      context: context || {}
    })

  } catch (error) {
    console.error('AI Tutor chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Tutor Chat API is running',
    endpoints: {
      chat: 'POST /api/ai-tutor/chat'
    }
  })
}