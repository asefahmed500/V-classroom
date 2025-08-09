"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  MessageCircle, 
  Code, 
  Monitor, 
  Upload, 
  Palette,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Copy,
  ExternalLink,
  Bot,
  Phone,
  PhoneOff,
  MoreVertical,
  Maximize2,
  Minimize2,
  Grid3X3,
  Sidebar,
  PanelRightClose,
  PanelRightOpen,
  Circle,
  Square
} from "lucide-react"
import { useWebRTC } from "@/hooks/useWebRTC"
import { RoomChat } from "./room-chat"
import EnhancedFileSharing from "./enhanced-file-sharing"
import { ScreenSharing } from "./screen-sharing"
import { CollaborativeWhiteboard } from "./collaborative-whiteboard"
import { CodeCollaboration } from "./code-collaboration"
import { AITutorSystem } from "./ai-tutor-system"
import { ConnectionStatus } from "./connection-status"

interface StudyRoomInterfaceProps {
  roomId: string
  roomCode: string
  roomName: string
  subject?: string
  userId: string
  userName: string
  isHost?: boolean
}

interface Participant {
  id: string
  name: string
  video: boolean
  audio: boolean
  isHost: boolean
}

export function StudyRoomInterface({ 
  roomId, 
  roomCode, 
  roomName,
  subject = "General",
  userId, 
  userName, 
  isHost = false 
}: StudyRoomInterfaceProps) {
  // Debug logging
  console.log('🔍 StudyRoomInterface received:', { roomId, roomCode, roomName })
  
  // Validate room code format
  const isValidRoomCode = roomCode && roomCode.length <= 10 && roomCode !== roomId
  const displayRoomCode = isValidRoomCode ? roomCode : 'INVALID_CODE'
  
  if (!isValidRoomCode) {
    console.warn('⚠️ Invalid room code received:', roomCode, 'Expected 6-digit code, got:', roomCode?.length, 'characters')
  }
  const [activeTab, setActiveTab] = useState("chat")
  const [showSidebar, setShowSidebar] = useState(true)
  const [showParticipants, setShowParticipants] = useState(true)
  const [videoLayout, setVideoLayout] = useState<'grid' | 'spotlight' | 'sidebar'>('grid')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [roomSettings, setRoomSettings] = useState({
    allowChat: true,
    allowScreenShare: true,
    allowFileShare: true,
    allowWhiteboard: true,
    allowCode: true
  })

  const webRTCData = useWebRTC({ roomId, userId, userName })
  
  const {
    socket,
    participants = [],
    localStream,
    remoteStreams = new Map(),
    isVideoEnabled = false,
    isAudioEnabled = false,
    isScreenSharing = false,
    isRecording = false,
    localVideoRef,
    toggleVideo = () => {},
    toggleAudio = () => {},
    toggleScreenShare = () => {},
    toggleRecording = () => {}
  } = webRTCData || {}

  // Set initialized state when webRTC data is available
  useEffect(() => {
    if (webRTCData && !isInitialized) {
      setTimeout(() => setIsInitialized(true), 100)
    }
  }, [webRTCData, isInitialized])

  // Monitor socket connection status
  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      console.log('🔌 Room interface: Socket connected')
      setTimeout(() => setIsConnected(true), 0)
    }
    
    const handleDisconnect = (reason) => {
      console.log('🔌 Room interface: Socket disconnected:', reason)
      setTimeout(() => setIsConnected(false), 0)
    }

    const handleRoomJoined = (data) => {
      console.log('🚪 Room joined successfully:', data)
      setTimeout(() => setIsConnected(true), 0)
    }

    const handleRoomJoinError = (error) => {
      console.error('❌ Room join error:', error)
      setTimeout(() => setIsConnected(false), 0)
    }

    // Set initial connection status with timeout to avoid setState during render
    setTimeout(() => {
      setIsConnected(socket?.connected || false)
    }, 0)
    
    // Set up event listeners
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('room-joined', handleRoomJoined)
    socket.on('room-join-error', handleRoomJoinError)

    // Periodic connection check every 5 seconds
    const connectionCheck = setInterval(() => {
      const currentStatus = socket?.connected || false
      setIsConnected(currentStatus)
      if (!currentStatus) {
        console.log('⚠️ Connection check: Socket disconnected, status updated')
      }
    }, 5000)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('room-joined', handleRoomJoined)
      socket.off('room-join-error', handleRoomJoinError)
      clearInterval(connectionCheck)
    }
  }, [socket])

  const copyRoomCode = () => {
    const codeToCopy = isValidRoomCode ? roomCode : 'ERROR_INVALID_CODE'
    navigator.clipboard.writeText(codeToCopy)
    console.log('📋 Copied room code:', codeToCopy)
  }

  const copyRoomLink = () => {
    const codeForLink = isValidRoomCode ? roomCode : roomId
    const roomLink = `${window.location.origin}/join?code=${codeForLink}`
    navigator.clipboard.writeText(roomLink)
    console.log('🔗 Copied room link:', roomLink)
  }

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room', { roomId, userId })
    }
    // Redirect to dashboard instead of home page (don't sign out)
    window.location.href = '/dashboard'
  }

  const deleteRoom = async () => {
    if (!isHost) return
    
    const confirmed = confirm('Are you sure you want to delete this room? All participants will be removed and this action cannot be undone.')
    if (!confirmed) return

    try {
      // Notify all participants that room is being deleted
      if (socket) {
        socket.emit('room-deleted', { roomId })
      }

      // Delete room from database
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        alert('Room deleted successfully')
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete room')
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('Failed to delete room. Please try again.')
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Notify all participants via socket
        if (socket) {
          socket.emit('room-deleted', { roomId })
        }
        // Redirect host to dashboard
        window.location.href = '/dashboard'
      } else {
        alert('Failed to delete room')
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      alert('Failed to delete room')
    }
  }

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Initializing room...</p>
          <p className="text-gray-400 text-sm mt-2">Connecting to {roomName}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Navigation Bar - Google Meet Style */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-white font-medium">{roomName}</h1>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span className={isValidRoomCode ? '' : 'text-red-400'}>{displayRoomCode}</span>
                  <Button onClick={copyRoomCode} size="sm" variant="ghost" className="h-5 w-5 p-0 text-gray-400 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            {isHost && (
              <Badge variant="secondary" className="bg-green-600 text-white">Host</Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
              <Users className="w-3 h-3 mr-1" />
              {participants?.length || 0}
            </Badge>
            <ConnectionStatus 
              socket={socket} 
              participantCount={participants?.length || 0} 
            />
            <Button 
              onClick={() => setShowSidebar(!showSidebar)}
              variant="ghost" 
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              {showSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
            {isHost && (
              <Button 
                onClick={deleteRoom} 
                variant="destructive" 
                size="sm"
                className="bg-red-800 hover:bg-red-900 mr-2"
              >
                Delete Room
              </Button>
            )}
            <Button 
              onClick={leaveRoom} 
              variant="destructive" 
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-4 h-4 mr-1" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Section - Google Meet Style */}
          <div className="flex-1 bg-black relative">
            {/* Video Grid */}
            <div className="h-full p-4">
              <div className={`h-full ${
                videoLayout === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : videoLayout === 'spotlight'
                  ? 'flex flex-col'
                  : 'flex'
              }`}>
                {/* Local Video */}
                <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${
                  videoLayout === 'grid' ? 'aspect-video' : 
                  videoLayout === 'spotlight' ? 'flex-1 mb-4' : 'w-48 aspect-video'
                }`}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-white text-xl font-semibold">
                            {userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-white text-sm">{userName}</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                    You {isHost && '(Host)'}
                  </div>
                  <div className="absolute bottom-2 right-2 flex space-x-1">
                    {!isVideoEnabled && (
                      <div className="bg-red-500 p-1 rounded-full">
                        <VideoOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {!isAudioEnabled && (
                      <div className="bg-red-500 p-1 rounded-full">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Remote Videos */}
                {Array.from(remoteStreams?.entries() || []).map(([participantId, stream]) => {
                  const participant = participants?.find(p => p.id === participantId)
                  return (
                    <div key={participantId} className={`relative bg-gray-800 rounded-lg overflow-hidden ${
                      videoLayout === 'grid' ? 'aspect-video' : 
                      videoLayout === 'spotlight' ? 'flex-1 mb-4' : 'w-48 aspect-video'
                    }`}>
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream
                          }
                        }}
                      />
                      {!participant?.video && (
                        <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-white text-xl font-semibold">
                                {(participant?.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="text-white text-sm">{participant?.name || 'Unknown'}</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                        {participant?.name || 'Unknown'} {participant?.isHost && '(Host)'}
                      </div>
                      <div className="absolute bottom-2 right-2 flex space-x-1">
                        {!participant?.video && (
                          <div className="bg-red-500 p-1 rounded-full">
                            <VideoOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!participant?.audio && (
                          <div className="bg-red-500 p-1 rounded-full">
                            <MicOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Video Controls - Bottom Center */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
              <div className="bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-full px-6 py-3 flex items-center space-x-4">
                <Button
                  onClick={toggleVideo}
                  variant="ghost"
                  size="sm"
                  className={`rounded-full w-12 h-12 p-0 ${
                    isVideoEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={toggleAudio}
                  variant="ghost"
                  size="sm"
                  className={`rounded-full w-12 h-12 p-0 ${
                    isAudioEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={toggleScreenShare}
                  variant="ghost"
                  size="sm"
                  className={`rounded-full w-12 h-12 p-0 ${
                    isScreenSharing 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                </Button>
                <div className="w-px h-6 bg-gray-600"></div>
                <Button
                  onClick={() => setVideoLayout(videoLayout === 'grid' ? 'spotlight' : 'grid')}
                  variant="ghost"
                  size="sm"
                  className="rounded-full w-12 h-12 p-0 bg-gray-700 hover:bg-gray-600 text-white"
                >
                  <Grid3X3 className="w-5 h-5" />
                </Button>
                <div className="w-px h-6 bg-gray-600"></div>
                <Button
                  onClick={toggleRecording}
                  variant="ghost"
                  size="sm"
                  className={`rounded-full w-12 h-12 p-0 ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar - Google Meet Style */}
        {showSidebar && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Sidebar Tabs */}
            <div className="border-b border-gray-700">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-none">
                  <TabsTrigger 
                    value="chat" 
                    className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger 
                    value="participants" 
                    className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    People
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tools" 
                    className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Tools
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsContent value="chat" className="h-full m-0 p-0">
                  <div className="h-full bg-gray-800">
                    <RoomChat
                      socket={socket}
                      roomId={roomId}
                      userId={userId}
                      userName={userName}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="participants" className="h-full m-0 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">Participants</h3>
                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                        {participants?.length || 0}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {(participants || []).map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white text-sm font-medium">
                                {participant.name}
                                {participant.id === userId && ' (You)'}
                              </div>
                              {participant.isHost && (
                                <Badge variant="outline" className="text-xs bg-green-600 text-white border-green-600">
                                  Host
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-1">
                            {participant.video ? (
                              <Video className="w-4 h-4 text-green-400" />
                            ) : (
                              <VideoOff className="w-4 h-4 text-red-400" />
                            )}
                            {participant.audio ? (
                              <Mic className="w-4 h-4 text-green-400" />
                            ) : (
                              <MicOff className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="h-full m-0 p-4">
                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Collaboration Tools</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => setActiveTab("ai")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
                      >
                        <Bot className="w-6 h-6 mb-1" />
                        <span className="text-xs">AI Tutor</span>
                      </Button>
                      
                      <Button
                        onClick={() => setActiveTab("whiteboard")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
                      >
                        <Palette className="w-6 h-6 mb-1" />
                        <span className="text-xs">Whiteboard</span>
                      </Button>
                      
                      <Button
                        onClick={() => setActiveTab("code")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
                      >
                        <Code className="w-6 h-6 mb-1" />
                        <span className="text-xs">Code Editor</span>
                      </Button>
                      
                      <Button
                        onClick={() => setActiveTab("files")}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
                      >
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs">File Share</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Tool Panels */}
                <TabsContent value="ai" className="h-full m-0">
                  <AITutorSystem
                    socket={socket}
                    roomId={roomId}
                    userId={userId}
                    userName={userName}
                    subject={subject}
                  />
                </TabsContent>

                <TabsContent value="whiteboard" className="h-full m-0">
                  <CollaborativeWhiteboard
                    socket={socket}
                    roomId={roomId}
                    userId={userId}
                    userName={userName}
                  />
                </TabsContent>

                <TabsContent value="code" className="h-full m-0">
                  <CodeCollaboration
                    socket={socket}
                    roomId={roomId}
                    userId={userId}
                    userName={userName}
                  />
                </TabsContent>

                <TabsContent value="files" className="h-full m-0">
                  <EnhancedFileSharing />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}