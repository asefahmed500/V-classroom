"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  Monitor, 
  Users, 
  Settings,
  MoreVertical,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Grid3X3,
  User,
  Pin,
  MessageSquare,
  Hand,
  Share
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Participant {
  id: string
  name: string
  videoEnabled: boolean
  audioEnabled: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  isPinned: boolean
  stream?: MediaStream
}

interface EnhancedVideoChatProps {
  roomId: string
  userId: string
  userName: string
  onLeave: () => void
}

export function EnhancedVideoChat({ roomId, userId, userName, onLeave }: EnhancedVideoChatProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "speaker" | "gallery">("grid")
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map())

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map())
  const audioContext = useRef<AudioContext | null>(null)
  const localAnalyser = useRef<AnalyserNode | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // WebRTC configuration with multiple STUN servers
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 10,
  }

  useEffect(() => {
    initializeMedia()
    initializeSocket()
    setupAudioLevelDetection()

    return () => {
      cleanup()
    }
  }, [])

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      setShowControls(true)
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    const handleMouseMove = () => resetControlsTimeout()
    
    document.addEventListener("mousemove", handleMouseMove)
    resetControlsTimeout()

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
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
          autoGainControl: true,
          sampleRate: 44100
        },
      })

      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Failed to access media devices:", error)
      setConnectionError("Failed to access camera/microphone. Please check permissions.")
    }
  }

  const setupAudioLevelDetection = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  const initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      console.log("Connected to video chat server")
      setIsConnected(true)
      setConnectionError(null)
      socketInstance.emit("join-room", roomId, userId, userName)
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from video chat server")
      setIsConnected(false)
    })

    socketInstance.on("user-joined", async (userData: any) => {
      console.log("User joined:", userData)
      await createPeerConnection(userData.id, true)
      setParticipants(prev => [...prev.filter(p => p.id !== userData.id), {
        id: userData.id,
        name: userData.name,
        videoEnabled: userData.videoEnabled,
        audioEnabled: userData.audioEnabled,
        isScreenSharing: false,
        isSpeaking: false,
        isPinned: false,
      }])
    })

    socketInstance.on("user-left", (userData: any) => {
      console.log("User left:", userData)
      removePeerConnection(userData.id)
    })

    socketInstance.on("webrtc-offer", async (data: any) => {
      await handleOffer(data.offer, data.from)
    })

    socketInstance.on("webrtc-answer", async (data: any) => {
      await handleAnswer(data.answer, data.from)
    })

    socketInstance.on("webrtc-ice-candidate", async (data: any) => {
      await handleIceCandidate(data.candidate, data.from)
    })

    socketInstance.on("user-video-toggle", (data: any) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, videoEnabled: data.enabled } : p
      ))
    })

    socketInstance.on("user-audio-toggle", (data: any) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, audioEnabled: data.enabled } : p
      ))
    })

    socketInstance.on("user-screen-share-start", (data: any) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, isScreenSharing: true } : p
      ))
    })

    socketInstance.on("user-screen-share-stop", (data: any) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, isScreenSharing: false } : p
      ))
    })

    socketInstance.on("error", (error: string) => {
      console.error("Socket error:", error)
      setConnectionError(error)
    })
  }

  const createPeerConnection = async (remoteUserId: string, isInitiator: boolean) => {
    try {
      const peerConnection = new RTCPeerConnection(rtcConfig)
      peerConnections.current.set(remoteUserId, peerConnection)

      // Add local stream to peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream)
        })
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote stream from:", remoteUserId)
        const [remoteStream] = event.streams
        remoteStreams.current.set(remoteUserId, remoteStream)
        
        setParticipants((prev) => {
          return prev.map(p => p.id === remoteUserId ? { ...p, stream: remoteStream } : p)
        })
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-ice-candidate", {
            roomId,
            candidate: event.candidate,
            from: userId
          })
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${remoteUserId}:`, peerConnection.connectionState)
        if (peerConnection.connectionState === "failed") {
          console.log("Connection failed, attempting to restart ICE")
          peerConnection.restartIce()
        }
      }

      // Create offer if initiator
      if (isInitiator) {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await peerConnection.setLocalDescription(offer)
        if (socket) {
          socket.emit("webrtc-offer", {
            roomId,
            offer,
            from: userId
          })
        }
      }
    } catch (error) {
      console.error("Error creating peer connection:", error)
      setConnectionError("Failed to establish video connection")
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    try {
      let peerConnection = peerConnections.current.get(fromUserId)
      if (!peerConnection) {
        await createPeerConnection(fromUserId, false)
        peerConnection = peerConnections.current.get(fromUserId)
      }

      if (peerConnection) {
        await peerConnection.setRemoteDescription(offer)
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        
        if (socket) {
          socket.emit("webrtc-answer", {
            roomId,
            answer,
            from: userId
          })
        }
      }
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

  const removePeerConnection = (remoteUserId: string) => {
    const peerConnection = peerConnections.current.get(remoteUserId)
    if (peerConnection) {
      peerConnection.close()
      peerConnections.current.delete(remoteUserId)
    }
    
    remoteStreams.current.delete(remoteUserId)
    setParticipants((prev) => prev.filter(p => p.id !== remoteUserId))
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        
        if (socket) {
          socket.emit("toggle-video", roomId, videoTrack.enabled)
        }
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        
        if (socket) {
          socket.emit("toggle-audio", roomId, audioTrack.enabled)
        }
      }
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true,
      })

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0]
      peerConnections.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === "video"
        )
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream
      }

      setIsScreenSharing(true)
      
      if (socket) {
        socket.emit("screen-share-start", roomId)
      }

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare()
      }
    } catch (error) {
      console.error("Error starting screen share:", error)
      setConnectionError("Failed to start screen sharing")
    }
  }

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false, // Keep existing audio
      })

      const videoTrack = cameraStream.getVideoTracks()[0]
      
      // Replace screen share track with camera track
      peerConnections.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === "video"
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
      
      if (socket) {
        socket.emit("screen-share-stop", roomId)
      }
    } catch (error) {
      console.error("Error stopping screen share:", error)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const pinParticipant = (participantId: string) => {
    setPinnedParticipant(pinnedParticipant === participantId ? null : participantId)
    setParticipants(prev => prev.map(p => ({
      ...p,
      isPinned: p.id === participantId ? !p.isPinned : false
    })))
  }

  const cleanup = () => {
    // Close all peer connections
    peerConnections.current.forEach((peerConnection) => {
      peerConnection.close()
    })
    peerConnections.current.clear()

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
      })
    }

    // Close audio context
    if (audioContext.current) {
      audioContext.current.close()
    }

    // Disconnect socket
    if (socket) {
      socket.emit("leave-room", roomId, userId)
      socket.disconnect()
    }
  }

  const handleLeave = () => {
    cleanup()
    onLeave()
  }

  const renderVideoGrid = () => {
    const allParticipants = [
      {
        id: userId,
        name: userName + " (You)",
        videoEnabled: isVideoEnabled,
        audioEnabled: isAudioEnabled,
        isScreenSharing,
        isSpeaking: false,
        isPinned: false,
        isLocal: true,
      },
      ...participants
    ]

    const pinnedUser = allParticipants.find(p => p.isPinned)
    const gridParticipants = pinnedUser ? [pinnedUser] : allParticipants

    const getGridClass = () => {
      const count = gridParticipants.length
      if (count === 1) return "grid-cols-1"
      if (count === 2) return "grid-cols-2"
      if (count <= 4) return "grid-cols-2 grid-rows-2"
      if (count <= 6) return "grid-cols-3 grid-rows-2"
      return "grid-cols-3 grid-rows-3"
    }

    return (
      <div className={`grid gap-2 h-full ${getGridClass()}`}>
        {gridParticipants.map((participant) => (
          <VideoTile
            key={participant.id}
            participant={participant}
            isLocal={participant.id === userId}
            localVideoRef={participant.id === userId ? localVideoRef : undefined}
            onPin={() => pinParticipant(participant.id)}
            isPinned={participant.isPinned}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="relative h-full bg-gray-900 overflow-hidden">
      {/* Connection Status */}
      <div className="absolute top-4 left-4 z-20">
        <Badge variant={isConnected ? "default" : "destructive"} className="bg-black/50 backdrop-blur">
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </Badge>
      </div>

      {/* Participant Count */}
      <div className="absolute top-4 right-4 z-20">
        <Badge variant="outline" className="bg-black/50 backdrop-blur text-white border-white/20">
          <Users className="w-3 h-3 mr-1" />
          {participants.length + 1}
        </Badge>
      </div>

      {/* Error Message */}
      {connectionError && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm">
            {connectionError}
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="h-full p-4">
        {renderVideoGrid()}
      </div>

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Control */}
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            variant={isScreenSharing ? "secondary" : "outline"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <Monitor className="w-5 h-5" />
          </Button>

          {/* View Mode */}
          <Button
            onClick={() => setViewMode(viewMode === "grid" ? "speaker" : "grid")}
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <Grid3X3 className="w-5 h-5" />
          </Button>

          {/* Fullscreen */}
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>

          {/* Leave Call */}
          <Button
            onClick={handleLeave}
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <Phone className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface VideoTileProps {
  participant: any
  isLocal?: boolean
  localVideoRef?: React.RefObject<HTMLVideoElement>
  onPin: () => void
  isPinned: boolean
}

function VideoTile({ participant, isLocal, localVideoRef, onPin, isPinned }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!isLocal && videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream, isLocal])

  return (
    <Card className="relative bg-gray-800 overflow-hidden group">
      <div className="aspect-video w-full h-full">
        {participant.videoEnabled ? (
          <video
            ref={isLocal ? localVideoRef : videoRef}
            autoPlay
            muted={isLocal}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        )}

        {/* Participant Info */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm backdrop-blur">
          {participant.name}
          {participant.isScreenSharing && " (Screen)"}
        </div>

        {/* Status Indicators */}
        <div className="absolute top-2 right-2 flex space-x-1">
          {!participant.videoEnabled && (
            <div className="bg-red-500 p-1 rounded">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
          {!participant.audioEnabled && (
            <div className="bg-red-500 p-1 rounded">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
          {participant.isSpeaking && (
            <div className="bg-green-500 p-1 rounded animate-pulse">
              <Volume2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Pin Button */}
        <Button
          onClick={onPin}
          variant="ghost"
          size="sm"
          className={`absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity ${isPinned ? 'opacity-100 bg-blue-500' : ''}`}
        >
          <Pin className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  )
}