"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Mic, MicOff, Video, VideoOff, Phone, Monitor, 
  Users, MessageSquare, FileText, Palette, Share2,
  Settings, Grid3X3, Maximize, Minimize, MoreVertical,
  PhoneOff, Hand, HandMetal, Volume2, VolumeX, Wifi,
  WifiOff, Clock, Eye, EyeOff, Camera, CameraOff,
  Copy, Link, UserPlus, Shield, Crown, Zap, Star, X
} from "lucide-react"
import { MultiUserVideoChat } from "./multi-user-video-chat"
import { EnhancedScreenSharing } from "./enhanced-screen-sharing"
import { CollaborativeWhiteboard } from "./collaborative-whiteboard"
import { EnhancedChat } from "./enhanced-chat"
import { EnhancedFileSharingV2 } from "./enhanced-file-sharing-v2"
import { io, type Socket } from "socket.io-client"
import { toast } from "sonner"

interface Participant {
  id: string
  name: string
  email?: string
  avatar?: string
  videoEnabled: boolean
  audioEnabled: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  isHandRaised: boolean
  joinedAt: number
  role: 'host' | 'moderator' | 'participant'
  connectionQuality: 'excellent' | 'good' | 'poor'
}

interface GoogleMeetRoomProps {
  roomId: string
  roomName: string
  roomCode: string
  userId: string
  userName: string
  userEmail?: string
  isHost: boolean
  onLeave: () => void
}

export function GoogleMeetRoomInterface({
  roomId,
  roomName,
  roomCode,
  userId,
  userName,
  userEmail,
  isHost,
  onLeave
}: GoogleMeetRoomProps) {
  // Socket and connection
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  // Participants
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentUser, setCurrentUser] = useState<Participant | null>(null)
  
  // Media states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(100)
  
  // UI states
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'whiteboard' | 'participants'>('chat')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showParticipantActions, setShowParticipantActions] = useState<string | null>(null)
  const [videoLayout, setVideoLayout] = useState<'grid' | 'spotlight' | 'sidebar'>('grid')
  
  // Session info
  const [sessionDuration, setSessionDuration] = useState(0)
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle')
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor'>('excellent')
  
  // Refs
  const sessionStartTime = useRef<number>(Date.now())
  const durationInterval = useRef<NodeJS.Timeout>()

  // Initialize socket connection
  useEffect(() => {
    initializeSocket()
    startDurationTimer()
    
    return () => {
      cleanup()
    }
  }, [])

  const initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      setConnectionStatus('connected')
      setNetworkQuality('excellent')
      toast.success("Connected to room")
      
      // Join room
      socketInstance.emit("join-google-meet-room", {
        roomId,
        userId,
        userName,
        userEmail,
        isHost
      })
    })

    socketInstance.on("connect_error", () => {
      setConnectionStatus('disconnected')
      setNetworkQuality('poor')
      toast.error("Connection failed")
    })

    socketInstance.on("disconnect", () => {
      setConnectionStatus('disconnected')
      toast.warning("Disconnected from room")
    })

    // Room events
    socketInstance.on("room-joined", (data) => {
      setParticipants(data.participants)
      const user = data.participants.find((p: Participant) => p.id === userId)
      if (user) {
        setCurrentUser(user)
      }
    })

    socketInstance.on("participant-joined", (participant) => {
      setParticipants(prev => [...prev, participant])
      toast.info(`${participant.name} joined`, {
        description: `${participants.length + 1} people in the room`
      })
    })

    socketInstance.on("participant-left", (participantId) => {
      const participant = participants.find(p => p.id === participantId)
      setParticipants(prev => prev.filter(p => p.id !== participantId))
      if (participant) {
        toast.info(`${participant.name} left the room`)
      }
    })

    socketInstance.on("participant-updated", (updatedParticipant) => {
      setParticipants(prev => prev.map(p => 
        p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
      ))
      
      if (updatedParticipant.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updatedParticipant } : null)
      }
    })

    socketInstance.on("hand-raised", ({ participantId, participantName }) => {
      if (participantId !== userId) {
        toast.info(`${participantName} raised their hand`)
      }
    })

    socketInstance.on("recording-started", ({ startedBy }) => {
      setRecordingStatus('recording')
      toast.success(`Recording started by ${startedBy}`)
    })

    socketInstance.on("recording-stopped", ({ stoppedBy }) => {
      setRecordingStatus('idle')
      toast.info(`Recording stopped by ${stoppedBy}`)
    })
  }

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime.current) / 1000))
    }, 1000)
  }

  const cleanup = () => {
    if (socket) {
      socket.emit("leave-room", { roomId, userId })
      socket.disconnect()
    }
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
    }
  }

  // Media controls
  const toggleVideo = () => {
    const newState = !isVideoEnabled
    setIsVideoEnabled(newState)
    
    socket?.emit("update-media", {
      roomId,
      userId,
      type: 'video',
      enabled: newState
    })
    
    toast.success(newState ? "Camera on" : "Camera off")
  }

  const toggleAudio = () => {
    const newState = !isAudioEnabled
    setIsAudioEnabled(newState)
    
    socket?.emit("update-media", {
      roomId,
      userId,
      type: 'audio',
      enabled: newState
    })
    
    toast.success(newState ? "Mic on" : "Mic off")
  }

  const toggleHandRaise = () => {
    const newState = !isHandRaised
    setIsHandRaised(newState)
    
    socket?.emit("raise-hand", {
      roomId,
      userId,
      userName,
      raised: newState
    })
    
    toast.success(newState ? "Hand raised" : "Hand lowered")
  }

  const startScreenShare = () => {
    setIsScreenSharing(true)
    socket?.emit("start-screen-share", {
      roomId,
      userId,
      userName
    })
  }

  const stopScreenShare = () => {
    setIsScreenSharing(false)
    socket?.emit("stop-screen-share", {
      roomId,
      userId
    })
  }

  const startRecording = () => {
    if (!isHost) {
      toast.error("Only hosts can start recording")
      return
    }
    
    socket?.emit("start-recording", {
      roomId,
      userId,
      userName
    })
  }

  const stopRecording = () => {
    if (!isHost) {
      toast.error("Only hosts can stop recording")
      return
    }
    
    socket?.emit("stop-recording", {
      roomId,
      userId
    })
  }

  const inviteParticipants = () => {
    const inviteLink = `${window.location.origin}/join?code=${roomCode}`
    navigator.clipboard.writeText(inviteLink)
    toast.success("Invite link copied to clipboard")
  }

  const muteParticipant = (participantId: string) => {
    if (!isHost) {
      toast.error("Only hosts can mute participants")
      return
    }
    
    socket?.emit("mute-participant", {
      roomId,
      participantId,
      mutedBy: userId
    })
  }

  const removeParticipant = (participantId: string) => {
    if (!isHost) {
      toast.error("Only hosts can remove participants")
      return
    }
    
    const participant = participants.find(p => p.id === participantId)
    if (participant && confirm(`Remove ${participant.name} from the room?`)) {
      socket?.emit("remove-participant", {
        roomId,
        participantId,
        removedBy: userId
      })
    }
  }

  const makeHost = (participantId: string) => {
    if (!isHost) {
      toast.error("Only hosts can assign host privileges")
      return
    }
    
    socket?.emit("make-host", {
      roomId,
      participantId,
      assignedBy: userId
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getConnectionIcon = () => {
    switch (networkQuality) {
      case 'excellent': return <Wifi className="w-4 h-4 text-green-500" />
      case 'good': return <Wifi className="w-4 h-4 text-yellow-500" />
      case 'poor': return <WifiOff className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Room Info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-white font-semibold text-lg">{roomName}</span>
            </div>
            
            <Badge variant="outline" className="text-gray-300 border-gray-600 font-mono">
              {roomCode}
            </Badge>
            
            {recordingStatus === 'recording' && (
              <Badge className="bg-red-600 text-white animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2" />
                REC
              </Badge>
            )}
          </div>
          
          {/* Session Info */}
          <div className="flex items-center space-x-4 text-gray-400 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{participants.length}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              {getConnectionIcon()}
              <span className="capitalize">{networkQuality}</span>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={inviteParticipants}
            variant="outline"
            size="sm"
            className="text-gray-300 border-gray-600 hover:bg-gray-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
          
          {isHost && (
            <Button
              onClick={recordingStatus === 'idle' ? startRecording : stopRecording}
              variant={recordingStatus === 'recording' ? "destructive" : "outline"}
              size="sm"
              className={recordingStatus === 'recording' ? "" : "text-gray-300 border-gray-600 hover:bg-gray-700"}
            >
              <div className={`w-3 h-3 rounded-full mr-2 ${
                recordingStatus === 'recording' ? 'bg-white animate-pulse' : 'bg-red-500'
              }`} />
              {recordingStatus === 'recording' ? 'Stop Recording' : 'Record'}
            </Button>
          )}
          
          <Button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
          >
            {sidebarVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          <MultiUserVideoChat
            roomId={roomId}
            userId={userId}
            userName={userName}
            onLeave={onLeave}
          />
          
          {/* Floating Control Bar */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center space-x-2 bg-gray-800/95 backdrop-blur-sm rounded-full px-6 py-4 border border-gray-700 shadow-2xl">
              {/* Audio Control */}
              <Button
                onClick={toggleAudio}
                variant={isAudioEnabled ? "ghost" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14 p-0 hover:scale-105 transition-transform"
              >
                {isAudioEnabled ? (
                  <Mic className="w-6 h-6 text-white" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </Button>
              
              {/* Video Control */}
              <Button
                onClick={toggleVideo}
                variant={isVideoEnabled ? "ghost" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14 p-0 hover:scale-105 transition-transform"
              >
                {isVideoEnabled ? (
                  <Video className="w-6 h-6 text-white" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </Button>
              
              {/* Screen Share */}
              <Button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                variant={isScreenSharing ? "default" : "ghost"}
                size="lg"
                className="rounded-full w-14 h-14 p-0 hover:scale-105 transition-transform"
              >
                <Monitor className="w-6 h-6" />
              </Button>
              
              {/* Raise Hand */}
              <Button
                onClick={toggleHandRaise}
                variant={isHandRaised ? "default" : "ghost"}
                size="lg"
                className="rounded-full w-14 h-14 p-0 hover:scale-105 transition-transform"
              >
                <Hand className={`w-6 h-6 ${isHandRaised ? 'text-yellow-400' : 'text-white'}`} />
              </Button>
              
              {/* More Options */}
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full w-14 h-14 p-0 hover:scale-105 transition-transform"
              >
                <MoreVertical className="w-6 h-6 text-white" />
              </Button>
              
              {/* Divider */}
              <div className="w-px h-8 bg-gray-600 mx-2" />
              
              {/* Leave Call */}
              <Button
                onClick={onLeave}
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14 p-0 hover:scale-105 transition-transform bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarVisible && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 bg-gray-700 m-3 rounded-lg">
                <TabsTrigger value="chat" className="text-xs rounded-md">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="participants" className="text-xs rounded-md">
                  <Users className="w-4 h-4 mr-1" />
                  People
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs rounded-md">
                  <FileText className="w-4 h-4 mr-1" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="whiteboard" className="text-xs rounded-md">
                  <Palette className="w-4 h-4 mr-1" />
                  Board
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 m-0">
                <EnhancedChat
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                />
              </TabsContent>

              <TabsContent value="participants" className="flex-1 m-0 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">
                      In this meeting ({participants.length})
                    </h3>
                    {isHost && (
                      <Button
                        onClick={inviteParticipants}
                        variant="outline"
                        size="sm"
                        className="text-gray-300 border-gray-600"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.id} className="group flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {participant.name[0].toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-700 ${
                              participant.connectionQuality === 'excellent' ? 'bg-green-500' :
                              participant.connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {participant.name}
                                {participant.id === userId && " (You)"}
                              </span>
                              {participant.role === 'host' && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                              {participant.role === 'moderator' && (
                                <Shield className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {participant.role === 'host' ? 'Host' : 
                               participant.role === 'moderator' ? 'Moderator' : 'Participant'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Status indicators */}
                          <div className="flex items-center space-x-1">
                            {participant.isHandRaised && (
                              <Hand className="w-4 h-4 text-yellow-500" />
                            )}
                            {participant.isScreenSharing && (
                              <Monitor className="w-4 h-4 text-green-500" />
                            )}
                            {!participant.audioEnabled && (
                              <MicOff className="w-4 h-4 text-red-500" />
                            )}
                            {!participant.videoEnabled && (
                              <VideoOff className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          
                          {/* Host actions */}
                          {isHost && participant.id !== userId && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={() => setShowParticipantActions(
                                  showParticipantActions === participant.id ? null : participant.id
                                )}
                                variant="ghost"
                                size="sm"
                                className="p-1"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </Button>
                              
                              {showParticipantActions === participant.id && (
                                <div className="absolute right-4 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[150px]">
                                  <div className="py-1">
                                    <button
                                      onClick={() => muteParticipant(participant.id)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                                    >
                                      Mute
                                    </button>
                                    <button
                                      onClick={() => makeHost(participant.id)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                                    >
                                      Make host
                                    </button>
                                    <button
                                      onClick={() => removeParticipant(participant.id)}
                                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="files" className="flex-1 m-0">
                <EnhancedFileSharingV2
                  socket={socket}
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  isHost={isHost}
                />
              </TabsContent>

              <TabsContent value="whiteboard" className="flex-1 m-0">
                <CollaborativeWhiteboard
                  socket={socket}
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Screen Share Overlay */}
      {isScreenSharing && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="w-full h-full max-w-7xl max-h-5xl p-4">
            <EnhancedScreenSharing
              socket={socket}
              roomId={roomId}
              userId={userId}
              userName={userName}
              isHost={isHost}
              onScreenShareStart={() => setIsScreenSharing(true)}
              onScreenShareStop={() => setIsScreenSharing(false)}
            />
          </div>
          
          <Button
            onClick={() => setIsScreenSharing(false)}
            variant="outline"
            className="absolute top-6 right-6 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      )}
    </div>
  )
}