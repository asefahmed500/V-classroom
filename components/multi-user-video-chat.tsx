"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  Mic, MicOff, Video, VideoOff, Phone, Monitor, 
  Users, Grid3X3, Maximize, Volume2, VolumeX, Settings
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Participant {
  id: string
  name: string
  videoEnabled: boolean
  audioEnabled: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
  stream?: MediaStream
}

interface MultiUserVideoChatProps {
  roomId: string
  userId: string
  userName: string
  onLeave: () => void
}

export function MultiUserVideoChat({ roomId, userId, userName, onLeave }: MultiUserVideoChatProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  }

  useEffect(() => {
    initializeMedia()
    initializeSocket()
    return () => cleanup()
  }, [])

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Failed to access media:", error)
    }
  }  con
st initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      setIsConnected(true)
      socketInstance.emit("join-room", roomId, userId, userName)
    })

    socketInstance.on("user-joined", async (userData: any) => {
      await createPeerConnection(userData.id, true)
      setParticipants(prev => [...prev.filter(p => p.id !== userData.id), {
        id: userData.id,
        name: userData.name,
        videoEnabled: true,
        audioEnabled: true,
        isScreenSharing: false,
        isSpeaking: false,
      }])
    })

    socketInstance.on("user-left", (userData: any) => {
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
  }

  const createPeerConnection = async (remoteUserId: string, isInitiator: boolean) => {
    const peerConnection = new RTCPeerConnection(rtcConfig)
    peerConnections.current.set(remoteUserId, peerConnection)

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream)
      })
    }

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      setParticipants(prev => prev.map(p => 
        p.id === remoteUserId ? { ...p, stream: remoteStream } : p
      ))
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-ice-candidate", {
          roomId, candidate: event.candidate, from: userId
        })
      }
    }

    if (isInitiator) {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      socket?.emit("webrtc-offer", { roomId, offer, from: userId })
    }
  }  const
 handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    let peerConnection = peerConnections.current.get(fromUserId)
    if (!peerConnection) {
      await createPeerConnection(fromUserId, false)
      peerConnection = peerConnections.current.get(fromUserId)
    }

    if (peerConnection) {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket?.emit("webrtc-answer", { roomId, answer, from: userId })
    }
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
    const peerConnection = peerConnections.current.get(fromUserId)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, fromUserId: string) => {
    const peerConnection = peerConnections.current.get(fromUserId)
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate)
    }
  }

  const removePeerConnection = (remoteUserId: string) => {
    const peerConnection = peerConnections.current.get(remoteUserId)
    if (peerConnection) {
      peerConnection.close()
      peerConnections.current.delete(remoteUserId)
    }
    setParticipants(prev => prev.filter(p => p.id !== remoteUserId))
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  } 
 const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, audio: true
      })
      
      const videoTrack = screenStream.getVideoTracks()[0]
      peerConnections.current.forEach(peerConnection => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === "video"
        )
        if (sender) sender.replaceTrack(videoTrack)
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream
      }
      
      setIsScreenSharing(true)
      videoTrack.onended = () => stopScreenShare()
    } catch (error) {
      console.error("Screen share error:", error)
    }
  }

  const stopScreenShare = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }, audio: false
      })
      
      const videoTrack = cameraStream.getVideoTracks()[0]
      peerConnections.current.forEach(peerConnection => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === "video"
        )
        if (sender) sender.replaceTrack(videoTrack)
      })

      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        const newStream = new MediaStream([videoTrack, audioTrack])
        setLocalStream(newStream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream
        }
      }
      
      setIsScreenSharing(false)
    } catch (error) {
      console.error("Stop screen share error:", error)
    }
  }

  const cleanup = () => {
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    socket?.disconnect()
  }

  const VideoTile = ({ participant, isLocal, localVideoRef }: any) => (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={isLocal ? localVideoRef : undefined}
        autoPlay
        muted={isLocal}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {participant.name}
      </div>
      <div className="absolute top-2 right-2 flex space-x-1">
        {!participant.audioEnabled && (
          <div className="bg-red-500 rounded-full p-1">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
        {!participant.videoEnabled && (
          <div className="bg-red-500 rounded-full p-1">
            <VideoOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  )

  const renderVideoGrid = () => {
    const allParticipants = [
      { id: userId, name: `${userName} (You)`, videoEnabled: isVideoEnabled, 
        audioEnabled: isAudioEnabled, isScreenSharing, isSpeaking: false, isLocal: true },
      ...participants
    ]

    const getGridClass = () => {
      const count = allParticipants.length
      if (count <= 1) return "grid-cols-1"
      if (count <= 4) return "grid-cols-2"
      if (count <= 9) return "grid-cols-3"
      return "grid-cols-4"
    }

    return (
      <div className={`grid gap-2 h-full ${getGridClass()}`}>
        {allParticipants.map(participant => (
          <VideoTile
            key={participant.id}
            participant={participant}
            isLocal={participant.id === userId}
            localVideoRef={participant.id === userId ? localVideoRef : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="relative h-full bg-gray-900">
      {/* Status Bar */}
      <div className="absolute top-4 left-4 z-20 flex space-x-2">
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </Badge>
        <Badge variant="outline" className="text-white border-white/20">
          <Users className="w-3 h-3 mr-1" />
          {participants.length + 1} participants
        </Badge>
      </div>

      {/* Video Grid */}
      <div className="h-full p-4">
        {renderVideoGrid()}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-black/50 backdrop-blur rounded-full px-6 py-3">
        <Button onClick={toggleAudio} variant={isAudioEnabled ? "default" : "destructive"} size="sm" className="rounded-full">
          {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        <Button onClick={toggleVideo} variant={isVideoEnabled ? "default" : "destructive"} size="sm" className="rounded-full">
          {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </Button>
        <Button onClick={isScreenSharing ? stopScreenShare : startScreenShare} variant="outline" size="sm" className="rounded-full">
          <Monitor className="w-4 h-4" />
        </Button>
        <Button onClick={() => setViewMode(viewMode === "grid" ? "speaker" : "grid")} variant="outline" size="sm" className="rounded-full">
          <Grid3X3 className="w-4 h-4" />
        </Button>
        <Button onClick={onLeave} variant="destructive" size="sm" className="rounded-full">
          <Phone className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}