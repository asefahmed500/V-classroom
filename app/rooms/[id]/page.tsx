"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedVideoChat } from "@/components/enhanced-video-chat"
import { CollaborativeWhiteboard } from "@/components/collaborative-whiteboard"
import { EnhancedChat } from "@/components/enhanced-chat"
import { ParticipantsList } from "@/components/participants-list"
import { SynchronizedTimer } from "@/components/synchronized-timer"
import { FileSharing } from "@/components/file-sharing"
import { CollaborativeNotes } from "@/components/collaborative-notes"
import { RoomInvite } from "@/components/room-invite"
import { Phone, Users, MessageCircle, FileText, Upload, StickyNote } from "lucide-react"

interface RoomData {
  _id: string
  name: string
  subject: string
  roomCode?: string
  participants: Array<{
    id: string
    name: string
    email?: string
    isHost: boolean
    videoEnabled: boolean
    audioEnabled: boolean
  }>
  maxParticipants: number
  roomType: string
}

interface PageProps {
  params: { id: string }
}

export default function StudyRoomPage({ params }: PageProps) {
  const [room, setRoom] = useState<RoomData | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; isHost: boolean } | null>(null)
  const [activeTab, setActiveTab] = useState("whiteboard")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoomData()
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [params.id])

  useEffect(() => {
    if (room) {
      fetchParticipants()
    }
  }, [room])

  const fetchRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${params.id}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setRoom(data)
      // For demo purposes, assume current user is the first participant
      if (data.participants && data.participants.length > 0) {
        const user = data.participants[0]
        setCurrentUser({ id: user.id, isHost: user.isHost })
      }
    } catch (error) {
      console.error("Failed to fetch room data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/rooms/${params.id}/participants`)
      if (response.ok) {
        const data = await response.json()
        setRoom((prev) => (prev ? { ...prev, participants: data.participants } : null))
      }
    } catch (error) {
      console.error("Failed to fetch participants:", error)
    }
  }

  const leaveRoom = async () => {
    try {
      // Save study session
      await fetch(`/api/rooms/${params.id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: 30 }), // Example duration
      })
    } catch (error) {
      console.error("Failed to save session:", error)
    }
    window.location.href = "/dashboard"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading study room...</div>
      </div>
    )
  }

  if (!room || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Room not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">{room.name}</h1>
            <Badge variant="secondary">{room.subject}</Badge>
            <Badge variant={room.roomType === "silent" ? "outline" : "default"}>{room.roomType}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <RoomInvite 
              roomId={params.id}
              roomName={room.name}
              roomCode={room.roomCode || ""}
              participants={room.participants}
            />
            <SynchronizedTimer roomId={params.id} userId={currentUser.id} isHost={currentUser.isHost} />
            <Button variant="destructive" onClick={leaveRoom}>
              <Phone className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Chat */}
          <EnhancedVideoChat 
            roomId={params.id} 
            userId={currentUser.id} 
            userName="Student" 
            onLeave={leaveRoom} 
          />

          {/* Content Tabs */}
          <div className="flex-1 bg-white">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                <TabsTrigger value="whiteboard" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Whiteboard</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center space-x-2">
                  <StickyNote className="w-4 h-4" />
                  <span>Notes</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Files</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whiteboard" className="flex-1 m-0">
                <CollaborativeWhiteboard roomId={params.id} userId={currentUser.id} />
              </TabsContent>

              <TabsContent value="notes" className="flex-1 m-0 p-4">
                <CollaborativeNotes roomId={params.id} userId={currentUser.id} />
              </TabsContent>

              <TabsContent value="files" className="flex-1 m-0 p-4">
                <FileSharing roomId={params.id} userId={currentUser.id} />
              </TabsContent>

              <TabsContent value="chat" className="flex-1 m-0">
                <div className="h-full">
                  <EnhancedChat 
                    roomId={params.id} 
                    userId={currentUser.id}
                    userName="Student"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Participants */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold mb-3 flex items-center text-white">
              <Users className="w-4 h-4 mr-2" />
              Participants ({room.participants.length}/{room.maxParticipants})
            </h3>
            <ParticipantsList participants={room.participants} />
          </div>

          {/* AI Assistant Quick Access */}
          <div className="p-4 border-b border-gray-700">
            <Button
              className="w-full bg-transparent"
              variant="outline"
              onClick={() => window.open("/ai-assistant", "_blank")}
            >
              🤖 AI Study Assistant
            </Button>
          </div>

          {/* Room Info */}
          <div className="p-4 text-sm text-gray-400">
            <div className="space-y-2">
              <div>Room ID: {params.id.slice(-8)}</div>
              <div>Subject: {room.subject}</div>
              <div>Type: {room.roomType}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
