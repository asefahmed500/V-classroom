"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AITutor } from "@/components/ai-tutor"
import { ArrowLeft, Brain, Sparkles } from "lucide-react"
import Link from "next/link"

export default function AIAssistantPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      setUserId(session.user.id)
      setUserName(session.user.name || 'User')
    } else {
      // For guest users, check localStorage
      const guestUser = localStorage.getItem('guestUser')
      if (guestUser) {
        const parsed = JSON.parse(guestUser)
        setUserId(parsed.id)
        setUserName(parsed.name)
      } else {
        // Generate guest user
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        setUserId(guestId)
        setUserName('Guest User')
      }
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-pulse mx-auto mb-4 flex items-center justify-center">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading AI Assistant...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-purple-600" />
                  AI Study Assistant
                </h1>
                <p className="text-sm text-gray-600">Get personalized help with your studies</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Powered by Gemini AI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to your AI Study Assistant
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              I'm here to help you understand concepts, solve problems, create study plans, and answer any academic questions you have.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-lg border border-purple-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Concept Explanations</h3>
              <p className="text-sm text-gray-600">Get clear, step-by-step explanations of complex topics in any subject.</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg border border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Practice Problems</h3>
              <p className="text-sm text-gray-600">Generate custom practice problems and get detailed solutions.</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg border border-indigo-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <ArrowLeft className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Study Planning</h3>
              <p className="text-sm text-gray-600">Create personalized study schedules and learning strategies.</p>
            </div>
          </div>

          {/* AI Tutor Component */}
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
            <AITutor 
              roomId="ai-assistant" 
              userId={userId} 
              userName={userName} 
            />
          </div>

          {/* Tips Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-4">💡 Tips for better interactions:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <ul className="space-y-2">
                <li>• Be specific about what you need help with</li>
                <li>• Select the relevant subject for better context</li>
                <li>• Ask follow-up questions to deepen understanding</li>
              </ul>
              <ul className="space-y-2">
                <li>• Request examples and real-world applications</li>
                <li>• Ask for study strategies and memory techniques</li>
                <li>• Use the quick prompts for common requests</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}