"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Share, User } from "lucide-react"
import { Socket } from "socket.io-client"

interface AIMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface AITutorProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
  subject?: string
}

export function AITutorSystem({ socket, roomId, userId, userName, subject = "General" }: AITutorProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!socket) return

    socket.on('ai-message-received', ({ userMessage, aiMessage, sharedBy }) => {
      const userMsg: AIMessage = {
        id: `user_${Date.now()}_${Math.random()}`,
        type: 'user',
        content: `${sharedBy}: ${userMessage}`,
        timestamp: new Date()
      }
      
      const aiMsg: AIMessage = {
        id: `ai_${Date.now()}_${Math.random()}`,
        type: 'ai',
        content: aiMessage,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMsg, aiMsg])
    })

    return () => {
      socket.off('ai-message-received')
    }
  }, [socket])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const generateAIResponse = (userInput: string): string => {
    const responses = {
      math: [
        "Let me help you with that math problem. Can you break it down into smaller steps?",
        "For mathematical problems, it's often helpful to identify what we know and what we need to find.",
        "Try working through this step by step. What's the first operation you need to perform?"
      ],
      science: [
        "That's an interesting science question! Let's think about the underlying principles.",
        "In science, it's important to consider cause and effect relationships.",
        "Can you identify the key variables in this problem?"
      ],
      programming: [
        "For coding problems, let's start by understanding the requirements clearly.",
        "Have you considered breaking this down into smaller functions?",
        "What's the expected input and output for this problem?"
      ],
      general: [
        "That's a great question! Let me help you think through this.",
        "Can you provide more context about what you're trying to understand?",
        "Let's approach this systematically. What do you already know about this topic?"
      ]
    }

    const lowerInput = userInput.toLowerCase()
    let category = 'general'
    
    if (lowerInput.includes('math') || lowerInput.includes('equation') || lowerInput.includes('calculate')) {
      category = 'math'
    } else if (lowerInput.includes('science') || lowerInput.includes('physics') || lowerInput.includes('chemistry')) {
      category = 'science'
    } else if (lowerInput.includes('code') || lowerInput.includes('program') || lowerInput.includes('function')) {
      category = 'programming'
    }

    const categoryResponses = responses[category]
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)]
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: AIMessage = {
      id: `user_${Date.now()}_${Math.random()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI processing delay
    setTimeout(() => {
      const aiResponse = generateAIResponse(input)
      const aiMessage: AIMessage = {
        id: `ai_${Date.now()}_${Math.random()}`,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000 + Math.random() * 2000)

    setInput('')
  }

  const shareWithRoom = (userMsg: string, aiMsg: string) => {
    if (socket) {
      socket.emit('ai-message-shared', {
        roomId,
        userMessage: userMsg,
        aiMessage: aiMsg,
        sharedBy: userName
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-medium">AI Tutor</h3>
        </div>
        <p className="text-gray-400 text-xs mt-1">Subject: {subject}</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ask me anything about {subject}!</p>
              <p className="text-xs mt-1">I'm here to help you learn and understand concepts.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-100'
              }`}>
                <div className="flex items-start space-x-2">
                  {message.type === 'ai' && (
                    <Bot className="w-4 h-4 mt-1 text-blue-400 flex-shrink-0" />
                  )}
                  {message.type === 'user' && (
                    <User className="w-4 h-4 mt-1 text-blue-200 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.type === 'ai' && index > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const userMsg = messages[index - 1]?.content || ''
                            shareWithRoom(userMsg, message.content)
                          }}
                          className="text-xs h-6 px-2 text-gray-300 hover:text-white"
                        >
                          <Share className="w-3 h-3 mr-1" />
                          Share
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your studies..."
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}