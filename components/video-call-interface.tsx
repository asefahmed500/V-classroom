"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Mic, MicOff, Video, VideoOff, Phone, Monitor, 
  Users, MessageSquare, FileText, Share2, Settings,
  Grid3X3, Maximize, Minimize, MoreVertical,
  PhoneOff, Hand, HandMetal, Volume2, VolumeX,
  Clock, Eye, EyeOff, Camera, CameraOff,
  Copy, Link, UserPlus, Shield, Crown, X
} from "lucide-react"
import { io, type Socket } from "socket.io-client"
import { toast } from "sonner"
import { VideoGrid } from "./video-grid"
import { RealTimeChat } from "./real-time-chat"
import { FileSharing } from "./file-sharing"

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
  stream?: MediaStream
}

interface VideoCallProps {
  roomId: string
  roomName: string
  roomCode: string
  userId: string
  userName: string
  userEmail?: string
  isHost: boolean
  onLeave: () => void
}

export function VideoCallInterface({
  roomId,
  roomName,
  roomCode,
  userId,
  userName,
  userEmail,
  isHost,
  onLeave
}: VideoCallProps) {
  // Socket and connection
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  // Participants and streams
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  
  // Media states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [speakerVolume, setSpeakerVolume] = useState(100)
  
  // UI states
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'participants'>('chat')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [videoLayout, setVideoLayout] = useState<'grid' | 'spotlight' | 'sidebar'>('grid')
  
  // Session info
  const [sessionDuration, setSessionDuration] = useState(0)
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle')
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor'>('excellent')
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const sessionStartTime = useRef<number>(Date.now())
  const durationInterval = useRef<NodeJS.Timeout>()

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  }

  // Initialize media and socket
  useEffect(() => {
    initializeMedia()
    initializeSocket()
    startDurationTimer()
    
    return () => {
      cleanup()
    }
  }, [])

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        },
      })
      
      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Failed to access media:", error)
      toast.error("Failed to access camera/microphone")
    }
  }

  const initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      setConnectionStatus('connected')
      setNetworkQuality('excellent')
      toast.success("Connected to video call")
      
      // Join video call room
      socketInstance.emit("join-video-call", {
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
      toast.warning("Disconnected from video call")
    })

    // Video call events
    socketInstance.on("participant-joined", (participant) => {
      setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant])
      toast.info(`${participant.name} joined the call`)
      
      // Create peer connection for new participant
      if (participant.id !== userId) {
        createPeerConnection(participant.id, true)
      }
    })

    socketInstance.on("participant-left", (participantId) => {
      const participant = participants.find(p => p.id === participantId)
      setParticipants(prev => prev.filter(p => p.id !== participantId))
      
      // Clean up peer connection
      const peerConnection = peerConnections.current.get(participantId)
      if (peerConnection) {
        peerConnection.close()
        peerConnections.current.delete(participantId)
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newStreams = new Map(prev)
        newStreams.delete(participantId)
        return newStreams
      })
      
      if (participant) {
        toast.info(`${participant.name} left the call`)
      }
    })

    socketInstance.on("participant-updated", (updatedParticipant) => {
      setParticipants(prev => prev.map(p => 
        p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
      ))
    })

    // WebRTC signaling
    socketInstance.on("webrtc-offer", async ({ offer, from }) => {
      await handleOffer(offer, from)
    })

    socketInstance.on("webrtc-answer", async ({ answer, from }) => {
      await handleAnswer(answer, from)
    })

    socketInstance.on("webrtc-ice-candidate", async ({ candidate, from }) => {
      await handleIceCandidate(candidate, from)
    })

    // Screen sharing events
    socketInstance.on("screen-share-started", ({ participantId, participantName }) => {
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, isScreenSharing: true } : p
      ))
      toast.info(`${participantName} started screen sharing`)
    })

    socketInstance.on("screen-share-stopped", ({ participantId }) => {
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, isScreenSharing: false } : p
      ))
    })

    // Recording events
    socketInstance.on("recording-started", ({ startedBy }) => {
      setRecordingStatus('recording')
      toast.success(`Recording started by ${startedBy}`)
    })

    socketInstance.on("recording-stopped", ({ stoppedBy }) => {
      setRecordingStatus('idle')
      toast.info(`Recording stopped by ${stoppedBy}`)
    })
  }

  const createPeerConnection = async (remoteUserId: string, isInitiator: boolean) => {
    const peerConnection = new RTCPeerConnection(rtcConfig)
    peerConnections.current.set(remoteUserId, peerConnection)

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      setRemoteStreams(prev => new Map(prev.set(remoteUserId, remoteStream)))
      
      // Update participant with stream
      setParticipants(prev => prev.map(p => 
        p.id === remoteUserId ? { ...p, stream: remoteStream } : p
      ))
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-ice-candidate", {
          roomId,
          candidate: event.candidate,
          from: userId,
          to: remoteUserId
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      console.log(`Peer connection with ${remoteUserId}: ${state}`)
      
      if (state === 'connected') {
        setParticipants(prev => prev.map(p => 
          p.id === remoteUserId ? { ...p, connectionQuality: 'excellent' } : p
        ))
      } else if (state === 'disconnected' || state === 'failed') {
        setParticipants(prev => prev.map(p => 
          p.id === remoteUserId ? { ...p, connectionQuality: 'poor' } : p
        ))
      }
    }

    // Create offer if initiator
    if (isInitiator) {
      try {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        
        socket?.emit("webrtc-offer", {
          roomId,
          offer,
          from: userId,
          to: remoteUserId
        })
      } catch (error) {
        console.error("Error creating offer:", error)
      }
    }

    return peerConnection
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    try {
      let peerConnection = peerConnections.current.get(fromUserId)
      
      if (!peerConnection) {
        peerConnection = await createPeerConnection(fromUserId, false)
      }

      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      socket?.emit("webrtc-answer", {
        roomId,
        answer,
        from: userId,
        to: fromUserId
      })
    } catch (error) {
      console.error("Error handling offer:", error)
    }
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
    try {
      const peerConnection = peerConnections.current.get(fromUserId)
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer)
      }
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, fromUserId: string) => {
    try {
      const peerConnection = peerConnections.current.get(fromUserId)
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate)
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime.current) / 1000))
    }, 1000)
  }

  const cleanup = () => {
    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    // Disconnect socket
    if (socket) {
      socket.emit("leave-video-call", { roomId, userId })
      socket.disconnect()
    }
    
    // Clear timer
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
    }
  }

  // Media controls
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        
        socket?.emit("update-media", {
          roomId,
          userId,
          type: 'video',
          enabled: videoTrack.enabled
        })
        
        toast.success(videoTrack.enabled ? "Camera on" : "Camera off")
      }
    }
  }, [localStream, socket, roomId, userId])

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        
        socket?.emit("update-media", {
          roomId,
          userId,
          type: 'audio',
          enabled: audioTrack.enabled
        })
        
        toast.success(audioTrack.enabled ? "Mic on" : "Mic off")
      }
    }
  }, [localStream, socket, roomId, userId])

  const toggleHandRaise = useCallback(() => {
    const newState = !isHandRaised
    setIsHandRaised(newState)
    
    socket?.emit("raise-hand", {
      roomId,
      userId,
      userName,
      raised: newState
    })
    
    toast.success(newState ? "Hand raised" : "Hand lowered")
  }, [isHandRaised, socket, roomId, userId, userName])

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })
      
      setIsScreenSharing(true)
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0]
      peerConnections.current.forEach(peerConnection => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })
      
      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream
      }
      
      socket?.emit("screen-share-started", {
        roomId,
        userId,
        userName
      })
      
      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare()
      }
      
      toast.success("Screen sharing started")
    } catch (error) {
      console.error("Error starting screen share:", error)
      toast.error("Failed to start screen sharing")
    }
  }, [socket, roomId, userId, userName])

  const stopScreenShare = useCallback(async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      
      const videoTrack = cameraStream.getVideoTracks()[0]
      
      // Replace screen share track with camera track
      peerConnections.current.forEach(peerConnection => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })
      
      // Update local stream
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        const newStream = new MediaStream([videoTrack, audioTrack])
        setLocalStream(newStream)
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream
        }
      }
      
      setIsScreenSharing(false)
      
      socket?.emit("screen-share-stopped", {
        roomId,
        userId
      })
      
      toast.success("Screen sharing stopped")
    } catch (error) {
      console.error("Error stopping screen share:", error)
      toast.error("Failed to stop screen sharing")
    }
  }, [localStream, socket, roomId, userId])

  const inviteParticipants = () => {
    const inviteLink = `${window.location.origin}/video-call/join?code=${roomCode}`
    navigator.clipboard.writeText(inviteLink)
    toast.success("Invite link copied to clipboard")
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
      case 'excellent': return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case 'good': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'poor': return <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
              {getConnectionIcon()}
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
          <div className="flex items-center space-x-4 text-gray-300 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{participants.length}</span>
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
          
          <Button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white"
          >
            {sidebarVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          <VideoGrid
            participants={participants}
            localStream={localStream}
            remoteStreams={remoteStreams}
            localVideoRef={localVideoRef}
            currentUserId={userId}
            layout={videoLayout}
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
              <TabsList className="grid w-full grid-cols-3 bg-gray-700 m-3 rounded-lg">
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
              </TabsList>

              <TabsContent value="chat" className="flex-1 m-0">
                <RealTimeChat
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  socket={socket}
                />
              </TabsContent>

              <TabsContent value="participants" className="flex-1 m-0 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">
                      In this call ({participants.length})
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
                      <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
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
                            </div>
                            <div className="text-gray-300 text-xs">
                              {participant.role === 'host' ? 'Host' : 'Participant'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {participant.isHandRaised && (
                            <Hand key="hand" className="w-4 h-4 text-yellow-500" />
                          )}
                          {participant.isScreenSharing && (
                            <Monitor key="screen" className="w-4 h-4 text-green-500" />
                          )}
                          {!participant.audioEnabled && (
                            <MicOff key="mic" className="w-4 h-4 text-red-500" />
                          )}
                          {!participant.videoEnabled && (
                            <VideoOff key="video" className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="files" className="flex-1 m-0">
                <FileSharing
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  socket={socket}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}