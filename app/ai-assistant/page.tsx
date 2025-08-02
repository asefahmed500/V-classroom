"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Brain, Send, ArrowLeft, BookOpen, Calculator, Lightbulb } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi! I'm your AI Study Assistant powered by Gemini. I can help you with explanations, practice questions, study techniques, and more. What would you like to study today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const quickPrompts = [
    { icon: Calculator, text: "Help me with calculus", category: "Math" },
    { icon: BookOpen, text: "Explain photosynthesis", category: "Biology" },
    { icon: Lightbulb, text: "Study tips for exams", category: "Study Skills" },
    { icon: Brain, text: "Generate practice questions", category: "Practice" },
  ]

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      } else {
        throw new Error("Failed to get AI response")
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-600" />
            <span className="text-xl font-bold">AI Study Assistant</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Quick Prompts Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-3 bg-transparent"
                    onClick={() => handleQuickPrompt(prompt.text)}
                  >
                    <div className="flex items-start space-x-3">
                      <prompt.icon className="w-5 h-5 mt-0.5 text-purple-600" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{prompt.text}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {prompt.category}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  AI Study Assistant
                  <Badge variant="secondary" className="ml-2">
                    Powered by Gemini
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${message.isUser ? "text-blue-100" : "text-gray-500"}`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                            <span className="text-gray-600">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="flex space-x-2 mt-4">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your studies..."
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={loading || !input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Subject Help
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Get explanations for complex concepts across all subjects including Math, Science, English, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-green-600" />
                Practice Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Generate custom practice problems and quizzes based on your study materials and topics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                Study Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Receive personalized study strategies, time management tips, and exam preparation advice.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
