"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Video, VideoOff, Mic, MicOff, Monitor, Phone, Users, 
  MessageCircle, FileText, Clock, Brain, Trophy, Settings,
  Upload, Download, Play, Pause, RotateCcw, BookOpen,
  PenTool, Eraser, Square, Circle, Type, Save
} from "lucide-react"
import { EnhancedVideoChat } from "./enhanced-video-chat"
import { CollaborativeWhiteboard } from "./collaborative-whiteboard"
import { StudyTimer } from "./study-timer"
import { FileSharing } from "./file-sharing"
import { CollaborativeNotes } from "./collaborative-notes"
import { LiveChat } from "./live-chat"
import { AITutor } from "./ai-tutor"
import { StudyAnalytics } from "./study-analytics"
import { AchievementSystem } from "./achievement-system"
import { RoomManagement } from "./room-management"
import { RoomRecorder } from "./room-recorder"

interface StudyRoomProps {
  roomId: string
  userId: string
  userName: string
  roomData: {
    name: string
    subject: string
    roomType: "silent" | "discussion" | "focus"
    description?: string
    maxParticipants: number
    _id?: string
    isPrivate?: boolean
    roomCode?: string
    participants?: any[]
    isActive?: boolean
    createdAt?: string
    settings?: any
  }
  onLeave: () => void
}

export function StudyRoom({ roomId, userId, userName, roomData, onLeave }: StudyRoomProps) {
  const [activeTab, setActiveTab] = useState("video")
  const [studySession, setStudySession] = useState({
    startTime: Date.now(),
    totalTime: 0,
    breakTime: 0,
    focusTime: 0,
    isActive: false
  })
  const [participants, setParticipants] = useState<any[]>(roomData.participants || [])
  const [achievements, setAchievements] = useState<any[]>([])
  const [fullRoomData, setFullRoomData] = useState<any>(null)

  useEffect(() => {
    // Initialize study session
    const timer = setTimeout(() => {
      setStudySession(prev => ({ ...prev, isActive: true, startTime: Date.now() }))
    }, 0)
    
    // Load achievements and full room data
    loadAchievements()
    loadFullRoomData()

    return () => clearTimeout(timer)
  }, [])

  const loadFullRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setFullRoomData(data)
        setParticipants(data.participants || [])
      }
    } catch (error) {
      console.error("Failed to load full room data:", error)
    }
  }

  const loadAchievements = async () => {
    try {
      const response = await fetch(`/api/achievements/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setAchievements(data.achievements || [])
      }
    } catch (error) {
      console.error("Failed to load achievements:", error)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Track analytics
    trackActivity("tab_change", { tab, roomId, userId })
  }

  const trackActivity = async (action: string, data: any) => {
    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data, timestamp: Date.now() })
      })
    } catch (error) {
      console.error("Failed to track activity:", error)
    }
  }

  const getRoomTypeColor = () => {
    switch (roomData.roomType) {
      case "silent": return "bg-blue-100 text-blue-800"
      case "discussion": return "bg-green-100 text-green-800"
      case "focus": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getRoomTypeIcon = () => {
    switch (roomData.roomType) {
      case "silent": return "🤫"
      case "discussion": return "💬"
      case "focus": return "🎯"
      default: return "📚"
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{roomData.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getRoomTypeColor()}>
                  {getRoomTypeIcon()} {roomData.roomType.charAt(0).toUpperCase() + roomData.roomType.slice(1)}
                </Badge>
                <Badge variant="outline">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {roomData.subject}
                </Badge>
                <Badge variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  {participants.length}/{roomData.maxParticipants}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StudyTimer 
              onTimeUpdate={(time) => setStudySession(prev => ({ ...prev, totalTime: time }))}
              roomType={roomData.roomType}
            />
            <Button onClick={onLeave} variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Tools */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 p-1 m-2">
              <TabsTrigger value="video" className="text-xs">
                <Video className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs">
                <MessageCircle className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">
                <FileText className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                <Brain className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="video" className="h-full m-0 p-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Video Participants</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div key={participant.id || participant.userId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                            {(participant.name || participant.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{participant.name || participant.userName || 'Unknown User'}</span>
                          <div className="flex space-x-1 ml-auto">
                            {!participant.videoEnabled && <VideoOff className="w-3 h-3 text-red-500" />}
                            {!participant.audioEnabled && <MicOff className="w-3 h-3 text-red-500" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="h-full m-0 p-2">
                <LiveChat roomId={roomId} userId={userId} userName={userName} />
              </TabsContent>

              <TabsContent value="notes" className="h-full m-0 p-2">
                <CollaborativeNotes roomId={roomId} userId={userId} userName={userName} />
              </TabsContent>

              <TabsContent value="ai" className="h-full m-0 p-2">
                <AITutor roomId={roomId} userId={userId} userName={userName} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Center Panel - Main Content */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="video" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-6 p-1 m-2">
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-2" />
                Video Chat
              </TabsTrigger>
              <TabsTrigger value="whiteboard">
                <PenTool className="w-4 h-4 mr-2" />
                Whiteboard
              </TabsTrigger>
              <TabsTrigger value="files">
                <Upload className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="recording">
                <Video className="w-4 h-4 mr-2" />
                Recording
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <Trophy className="w-4 h-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="manage">
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="video" className="h-full m-0">
                <EnhancedVideoChat 
                  roomId={roomId} 
                  userId={userId} 
                  userName={userName}
                  onLeave={onLeave}
                />
              </TabsContent>

              <TabsContent value="whiteboard" className="h-full m-0">
                <CollaborativeWhiteboard roomId={roomId} userId={userId} />
              </TabsContent>

              <TabsContent value="files" className="h-full m-0">
                <FileSharing 
                  socket={null} 
                  roomId={roomId} 
                  userId={userId} 
                  userName={userName} 
                />
              </TabsContent>

              <TabsContent value="recording" className="h-full m-0 p-4">
                <div className="max-w-2xl mx-auto">
                  <RoomRecorder
                    roomId={roomId}
                    userId={userId}
                    userName={userName}
                    isHost={fullRoomData?.createdBy === userId}
                  />
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="h-full m-0 p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  <StudyAnalytics userId={userId} roomId={roomId} />
                  <AchievementSystem 
                    userId={userId} 
                    achievements={achievements}
                    onAchievementUnlocked={(achievement) => {
                      setAchievements(prev => [...prev, achievement])
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="manage" className="h-full m-0 p-4">
                <div className="max-w-4xl mx-auto">
                  {fullRoomData && (
                    <RoomManagement
                      roomId={roomId}
                      roomData={{
                        name: fullRoomData.name,
                        subject: fullRoomData.subject,
                        description: fullRoomData.description,
                        privacy: fullRoomData.isPrivate ? 'private' : 'public',
                        maxParticipants: fullRoomData.maxParticipants,
                        createdBy: fullRoomData.createdBy || 'unknown',
                        createdAt: fullRoomData.createdAt || new Date().toISOString(),
                        participants: participants
                      }}
                      userId={userId}
                      onRoomDeleted={onLeave}
                    />
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}