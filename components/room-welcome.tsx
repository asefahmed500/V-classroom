"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoomCodeDisplay } from "./room-code-display"
import { 
  Video, 
  Mic, 
  Users, 
  MessageCircle, 
  FileText, 
  PenTool, 
  Clock,
  BookOpen,
  Settings,
  Play,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Crown,
  Calendar,
  Shield,
  Globe,
  Lock,
  Monitor,
  Bot
} from "lucide-react"

interface RoomWelcomeProps {
  roomData: {
    name: string
    subject: string
    roomCode: string
    description?: string
    maxParticipants: number
    participantCount: number
    settings?: any
    createdBy?: string
    creatorName?: string
    creatorEmail?: string
    createdAt?: string
    privacy?: string
  }
  userName: string
  onEnterRoom: () => void
}

export function RoomWelcome({ roomData, userName, onEnterRoom }: RoomWelcomeProps) {
  const [copied, setCopied] = useState(false)

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomData.roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy room code:', error)
    }
  }

  const features = [
    {
      icon: Video,
      title: "Video Chat",
      description: "Face-to-face collaboration with your study partners",
      enabled: roomData.settings?.allowVideo !== false
    },
    {
      icon: Monitor,
      title: "Screen Share",
      description: "Share your screen for presentations and demos",
      enabled: roomData.settings?.allowScreenShare !== false
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Text messaging for quick questions and discussions",
      enabled: roomData.settings?.allowChat !== false
    },
    {
      icon: PenTool,
      title: "Whiteboard",
      description: "Collaborative drawing and problem solving",
      enabled: roomData.settings?.allowWhiteboard !== false
    },
    {
      icon: FileText,
      title: "File Sharing",
      description: "Share documents and study materials",
      enabled: roomData.settings?.allowFileShare !== false
    },
    {
      icon: Bot,
      title: "AI Assistant",
      description: "Get help from AI for study questions and explanations",
      enabled: roomData.settings?.allowAI !== false
    },
    {
      icon: Clock,
      title: "Recording",
      description: "Record sessions for later review",
      enabled: roomData.settings?.allowRecording !== false
    },
    {
      icon: Users,
      title: "Participant Management",
      description: "See who's in the room and their status",
      enabled: true
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="shadow-2xl border-0 overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Welcome to {roomData.name}</CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              {roomData.subject} • {roomData.participantCount}/{roomData.maxParticipants} participants
            </CardDescription>
            {roomData.description && (
              <p className="text-blue-100 mt-2 max-w-2xl mx-auto">
                {roomData.description}
              </p>
            )}
            
            {/* Room Info Bar */}
            <div className="flex items-center justify-center space-x-6 mt-4 text-blue-100">
              {roomData.creatorName && (
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm">Created by {roomData.creatorName}</span>
                </div>
              )}
              {roomData.createdAt && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{new Date(roomData.createdAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                {roomData.privacy === 'private' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">Private Room</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">Public Room</span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0">
              <CardContent className="p-8">
                {/* Welcome Message */}
                <div className="text-center mb-8">
                  <p className="text-gray-600 text-lg">
                    Hi <strong>{userName}</strong>! You're about to join this collaborative study session.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                    Available Features
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          feature.enabled
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <feature.icon className={`w-5 h-5 ${
                            feature.enabled ? 'text-green-600' : 'text-gray-400'
                          }`} />
                          <h4 className="font-medium text-gray-900">{feature.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Study Tips */}
                <div className="bg-blue-50 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Study Tips for Success
                  </h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Keep your microphone muted when not speaking to reduce background noise</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Use the whiteboard for visual explanations and problem solving</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Take advantage of the Pomodoro timer to maintain focus</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span>Share your screen to show documents or presentations</span>
                    </li>
                  </ul>
                </div>

                {/* Enter Room Button */}
                <div className="text-center">
                  <Button
                    onClick={onEnterRoom}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 group"
                  >
                    <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                    Enter Study Room
                  </Button>
                  <p className="text-sm text-gray-500 mt-3">
                    Ready to start your collaborative learning session?
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with Room Code */}
          <div>
            <RoomCodeDisplay
              roomCode={roomData.roomCode}
              roomName={roomData.name}
              roomId={roomData.name} // Using name as fallback ID
              participantCount={roomData.participantCount}
              maxParticipants={roomData.maxParticipants}
              isHost={false} // Will be determined by actual user role
              className="mb-6"
            />
          </div>
        </div>
      </div>
    </div>
  )
}