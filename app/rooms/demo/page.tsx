"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Phone, 
  Users, 
  MessageCircle, 
  FileText, 
  Upload, 
  StickyNote, 
  Monitor, 
  Brain,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Share2,
  Crown
} from "lucide-react"

export default function DemoRoomPage() {
  const [activeTab, setActiveTab] = useState("whiteboard")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [participants] = useState([
    { id: "1", name: "You", isHost: true, videoEnabled: true, audioEnabled: true },
    { id: "2", name: "Alice", isHost: false, videoEnabled: true, audioEnabled: false },
    { id: "3", name: "Bob", isHost: false, videoEnabled: false, audioEnabled: true },
  ])

  const demoRoom = {
    name: "Demo Study Room",
    subject: "Mathematics",
    roomCode: "DEMO01",
    roomType: "discussion",
    maxParticipants: 8
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">{demoRoom.name}</h1>
            <Badge variant="secondary">{demoRoom.subject}</Badge>
            <Badge variant="default">{demoRoom.roomType}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Invite
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Timer
            </Button>
            <Button variant="destructive" onClick={() => window.history.back()}>
              <Phone className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Chat Area */}
          <div className="h-64 bg-gray-800 relative">
            <div className="grid grid-cols-3 gap-2 h-full p-4">
              {participants.map((participant) => (
                <Card key={participant.id} className="bg-gray-700 relative overflow-hidden">
                  <CardContent className="p-0 h-full flex items-center justify-center">
                    {participant.videoEnabled ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-800">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Participant Info */}
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      {participant.name}
                      {participant.isHost && <Crown className="w-3 h-3 inline ml-1" />}
                    </div>

                    {/* Status Indicators */}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      {!participant.audioEnabled && (
                        <div className="bg-red-500 p-1 rounded">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
              <Button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-12 h-12 p-0"
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-12 h-12 p-0"
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12 p-0"
              >
                <Monitor className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="flex-1 bg-white">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-6 bg-gray-100">
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
                <TabsTrigger value="screen" className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Screen Share</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>AI Tutor</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whiteboard" className="flex-1 m-0 p-8">
                <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Collaborative Whiteboard</h3>
                    <p>Draw, sketch, and collaborate in real-time</p>
                    <p className="text-sm mt-2">This is a demo - full functionality available in production</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="flex-1 m-0 p-8">
                <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <StickyNote className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Collaborative Notes</h3>
                    <p>Create and edit notes together</p>
                    <p className="text-sm mt-2">This is a demo - full functionality available in production</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="files" className="flex-1 m-0 p-8">
                <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Upload className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">File Sharing</h3>
                    <p>Upload and share files with participants</p>
                    <p className="text-sm mt-2">This is a demo - full functionality available in production</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="flex-1 m-0 p-8">
                <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Real-time Chat</h3>
                    <p>Chat with participants instantly</p>
                    <p className="text-sm mt-2">This is a demo - full functionality available in production</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="screen" className="flex-1 m-0 p-8">
                <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Monitor className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Screen Sharing</h3>
                    <p>Share your screen with advanced options</p>
                    <p className="text-sm mt-2">This is a demo - full functionality available in production</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="flex-1 m-0 p-8">
                <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Brain className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">AI Study Tutors</h3>
                    <p>Get help from specialized AI tutors</p>
                    <p className="text-sm mt-2">This is a demo - full functionality available in production</p>
                  </div>
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
              Participants ({participants.length}/{demoRoom.maxParticipants})
            </h3>
            <div className="space-y-2">
              {participants.map((participant) => (
                <Card key={participant.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {participant.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{participant.name}</span>
                          {participant.isHost && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                              Host
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`p-1 rounded ${participant.audioEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                            {participant.audioEnabled ? (
                              <Mic className="w-3 h-3 text-white" />
                            ) : (
                              <MicOff className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className={`p-1 rounded ${participant.videoEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                            {participant.videoEnabled ? (
                              <Video className="w-3 h-3 text-white" />
                            ) : (
                              <VideoOff className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Room Info */}
          <div className="p-4 text-sm text-gray-400">
            <div className="space-y-2">
              <div>Room Code: <Badge variant="outline" className="ml-2">{demoRoom.roomCode}</Badge></div>
              <div>Subject: {demoRoom.subject}</div>
              <div>Type: {demoRoom.roomType}</div>
              <div className="pt-2 text-xs text-gray-500">
                This is a demo room showcasing the interface and features.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}