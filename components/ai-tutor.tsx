"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Brain, 
  Send, 
  Sparkles, 
  BookOpen, 
  Calculator, 
  Beaker, 
  Globe,
  History,
  Lightbulb,
  MessageSquare,
  Loader2
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  subject?: string
}

interface AITutorProps {
  roomId: string
  userId: string
  userName: string
}

export const AITutor = ({ roomId, userId, userName }: AITutorProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const subjects = [
    { name: 'Mathematics', icon: Calculator, color: 'bg-blue-500' },
    { name: 'Physics', icon: Globe, color: 'bg-green-500' },
    { name: 'Chemistry', icon: Beaker, color: 'bg-purple-500' },
    { name: 'Biology', icon: BookOpen, color: 'bg-orange-500' },
    { name: 'History', icon: History, color: 'bg-red-500' },
    { name: 'General', icon: Lightbulb, color: 'bg-yellow-500' }
  ]

  const quickPrompts = [
    "Explain this concept in simple terms",
    "Give me practice problems",
    "What are the key points to remember?",
    "How does this relate to real life?",
    "Create a study plan for this topic"
  ]

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/ai-tutor/history?roomId=${roomId}&userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        } else {
          // If history loading fails, just start with empty messages
          console.log('No chat history found, starting fresh')
        }
      } catch (error) {
        console.log('Chat history not available, starting fresh:', error)
        // Don't show error to user, just start with empty chat
      }
    }

    if (roomId && userId) {
      loadChatHistory()
    }
  }, [roomId, userId])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      subject: selectedSubject
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          subject: selectedSubject,
          roomId,
          userId,
          userName,
          chatHistory: messages.slice(-10) // Send last 10 messages for context
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'I received your message but had trouble generating a response. Could you try rephrasing your question?',
          timestamp: new Date(),
          subject: selectedSubject
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // Try to get error details
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', response.status, errorData)
        
        // Provide a helpful fallback response
        const fallbackResponses = [
          "I'm having trouble connecting right now, but I can still help! What specific topic would you like to discuss?",
          "Let me try to help you with that. Could you provide more details about what you're studying?",
          "I'm here to assist with your studies. What subject are you working on today?",
          "Even though I'm having some technical difficulties, I'd love to help you learn. What's your question about?"
        ]
        
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
          timestamp: new Date(),
          subject: selectedSubject
        }
        setMessages(prev => [...prev, fallbackMessage])
      }
    } catch (error) {
      console.error('AI Tutor error:', error)
      
      // Provide contextual help based on the subject
      let helpfulResponse = "I'm having some technical difficulties, but I'm still here to help you study! "
      
      if (selectedSubject) {
        switch (selectedSubject.toLowerCase()) {
          case 'mathematics':
            helpfulResponse += "For math problems, try breaking them down step by step. What specific concept are you working on?"
            break
          case 'physics':
            helpfulResponse += "Physics can be tricky! Are you working on mechanics, electricity, or another area?"
            break
          case 'chemistry':
            helpfulResponse += "Chemistry involves lots of formulas and reactions. What topic are you studying?"
            break
          case 'biology':
            helpfulResponse += "Biology covers so many fascinating topics! What area are you focusing on?"
            break
          case 'history':
            helpfulResponse += "History is all about understanding context and connections. What period are you studying?"
            break
          default:
            helpfulResponse += "What subject or topic would you like help with?"
        }
      } else {
        helpfulResponse += "What subject would you like to study together?"
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: helpfulResponse,
        timestamp: new Date(),
        subject: selectedSubject
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const useQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            AI Study Tutor
          </CardTitle>
          <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
            <Sparkles className="w-3 h-3 mr-1" />
            Powered by Gemini
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-0">
        {/* Subject Selection */}
        <div className="px-6">
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => {
              const Icon = subject.icon
              return (
                <Button
                  key={subject.name}
                  variant={selectedSubject === subject.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSubject(subject.name)}
                  className="flex items-center gap-1"
                >
                  <Icon className="w-3 h-3" />
                  {subject.name}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to your AI Study Tutor!
              </h3>
              <p className="text-gray-600 mb-4">
                I'm here to help you understand concepts, solve problems, and improve your learning.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Try asking me:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickPrompts.slice(0, 3).map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => useQuickPrompt(prompt)}
                      className="text-xs"
                    >
                      "{prompt}"
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}>
                    {message.role === 'user' ? userName.charAt(0).toUpperCase() : <Brain className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex-1 max-w-xs ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.role === 'user' ? 'You' : 'AI Tutor'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.subject && (
                      <Badge variant="secondary" className="text-xs">
                        {message.subject}
                      </Badge>
                    )}
                  </div>
                  
                  <div
                    className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-purple-500 text-white">
                  <Brain className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length > 0 && (
          <div className="px-6">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => useQuickPrompt(prompt)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedSubject ? `Ask about ${selectedSubject}...` : "Ask me anything about your studies..."}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}