"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  Phone,
  Users,
  Maximize,
  Minimize,
  Volume2,
  VolumeX
} from "lucide-react"
import { io, Socket } from "socket.io-client"

interface Participant {
  id: string
  name: string
  videoEnabled: boolean
  audioEnabled: boolean
  stream?: MediaStream
  isScreenSharing?: boolean
}

interface EnhancedVideoChatProps {
  roomId: string
  userId: string
  userName: string
  onLeave: () => void
}

export function EnhancedVideoChat({ roomId, userId, userName, onLeave }: EnhancedVideoChatProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map())
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize Socket.IO connection with better error handling
  useEffect(() => {
    if (!roomId || !userId || !userName) return

    const initializeSocket = async () => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
        console.log("Attempting video chat connection to:", socketUrl)
        
        const newSocket = io(socketUrl, {
          transports: ["websocket", "polling"],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
        })

        newSocket.on("connect", () => {
          console.log("Video chat connected to Socket.IO server")
          newSocket.emit("join-room", roomId, userId, userName)
        })

        newSocket.on("connect_error", (error) => {
          console.error("Video chat connection error:", error)
        })

        newSocket.on("disconnect", (reason) => {
          console.log("Video chat disconnected:", reason)
        })

        newSocket.on("user-joined", (user: Participant) => {
          console.log("User joined:", user)
          setParticipants(prev => [...prev.filter(p => p.id !== user.id), user])
          createPeerConnection(user.id, true)
        })

        newSocket.on("user-left", ({ userId: leftUserId }) => {
          console.log("User left:", leftUserId)
          setParticipants(prev => prev.filter(p => p.id !== leftUserId))
          const pc = peerConnections.get(leftUserId)
          if (pc) {
            pc.close()
            setPeerConnections(prev => {
              const newMap = new Map(prev)
              newMap.delete(leftUserId)
              return newMap
            })
          }
        })

        newSocket.on("webrtc-offer", async ({ offer, from }) => {
          console.log("Received offer from:", from)
          await handleOffer(offer, from)
        })

        newSocket.on("webrtc-answer", async ({ answer, from }) => {
          console.log("Received answer from:", from)
          await handleAnswer(answer, from)
        })

        newSocket.on("webrtc-ice-candidate", async ({ candidate, from }) => {
          console.log("Received ICE candidate from:", from)
          await handleIceCandidate(candidate, from)
        })

        newSocket.on("room-state", ({ participants: roomParticipants }) => {
          console.log("Room state:", roomParticipants)
          if (Array.isArray(roomParticipants)) {
            setParticipants(roomParticipants.filter((p: Participant) => p.id !== userId))
          }
        })

        newSocket.on("media-state-changed", ({ userId: changedUserId, videoEnabled, audioEnabled }) => {
          console.log("Media state changed:", changedUserId, { videoEnabled, audioEnabled })
          setParticipants(prev => 
            prev.map(p => 
              p.id === changedUserId 
                ? { ...p, videoEnabled, audioEnabled }
                : p
            )
          )
        })

        setSocket(newSocket)

        return () => {
          newSocket.disconnect()
          peerConnections.forEach(pc => pc.close())
        }
      } catch (error) {
        console.error("Failed to initialize video chat socket:", error)
      }
    }

    initializeSocket()
  }, [roomId, userId, userName])

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        // Check if we're in a secure context
        if (typeof window === 'undefined' || !navigator.mediaDevices) {
          console.warn("Media devices not available")
          return
        }

        // Request permissions first
        const permissions = await Promise.all([
          navigator.permissions?.query({ name: 'camera' as PermissionName }),
          navigator.permissions?.query({ name: 'microphone' as PermissionName })
        ].filter(Boolean))

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Failed to access media devices:", error)
        // Set video and audio to false if permission denied
        if (error instanceof Error && error.name === 'NotAllowedError') {
          setIsVideoEnabled(false)
          setIsAudioEnabled(false)
        }
      }
    }

    // Only initialize if we have socket connection
    if (socket) {
      initializeMedia()
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [socket])

  // WebRTC peer connection creation
  const createPeerConnection = (peerId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    })

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote stream from:", peerId)
      const [remoteStream] = event.streams
      setParticipants(prev => 
        prev.map(p => 
          p.id === peerId ? { ...p, stream: remoteStream } : p
        )
      )
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-ice-candidate", {
          candidate: event.candidate,
          roomId,
          to: peerId
        })
      }
    }

    setPeerConnections(prev => new Map(prev).set(peerId, pc))

    // Create offer if initiator
    if (isInitiator) {
      createOffer(pc, peerId)
    }

    return pc
  }

  const createOffer = async (pc: RTCPeerConnection, peerId: string) => {
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      if (socket) {
        socket.emit("webrtc-offer", {
          offer,
          roomId,
          to: peerId
        })
      }
    } catch (error) {
      console.error("Error creating offer:", error)
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    try {
      let pc = peerConnections.get(from)
      if (!pc) {
        pc = createPeerConnection(from, false)
      }

      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      if (socket) {
        socket.emit("webrtc-answer", {
          answer,
          roomId,
          to: from
        })
      }
    } catch (error) {
      console.error("Error handling offer:", error)
    }
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    try {
      const pc = peerConnections.get(from)
      if (pc) {
        await pc.setRemoteDescription(answer)
      }
    } catch (error) {
      console.error("Error handling answer:", error)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    try {
      const pc = peerConnections.get(from)
      if (pc) {
        await pc.addIceCandidate(candidate)
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  // Media controls
  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        
        // Notify other participants about video state change
        if (socket) {
          socket.emit("media-state-change", {
            roomId,
            userId,
            videoEnabled: videoTrack.enabled,
            audioEnabled: isAudioEnabled
          })
        }
      }
    } else if (!isVideoEnabled) {
      // Try to re-enable video if it was disabled
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        
        const videoTrack = stream.getVideoTracks()[0]
        if (localStream) {
          // Replace the video track
          const audioTrack = localStream.getAudioTracks()[0]
          const newStream = new MediaStream([videoTrack, audioTrack])
          setLocalStream(newStream)
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream
          }
          
          // Update peer connections
          peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
              sender.replaceTrack(videoTrack)
            }
          })
        }
        
        setIsVideoEnabled(true)
        
        if (socket) {
          socket.emit("media-state-change", {
            roomId,
            userId,
            videoEnabled: true,
            audioEnabled: isAudioEnabled
          })
        }
      } catch (error) {
        console.error("Failed to re-enable video:", error)
      }
    }
  }

  const toggleAudio = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        
        // Notify other participants about audio state change
        if (socket) {
          socket.emit("media-state-change", {
            roomId,
            userId,
            videoEnabled: isVideoEnabled,
            audioEnabled: audioTrack.enabled
          })
        }
      }
    } else if (!isAudioEnabled) {
      // Try to re-enable audio if it was disabled
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: { echoCancellation: true, noiseSuppression: true }
        })
        
        const audioTrack = stream.getAudioTracks()[0]
        if (localStream) {
          // Replace the audio track
          const videoTrack = localStream.getVideoTracks()[0]
          const newStream = new MediaStream([videoTrack, audioTrack])
          setLocalStream(newStream)
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream
          }
          
          // Update peer connections
          peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
            if (sender) {
              sender.replaceTrack(audioTrack)
            }
          })
        }
        
        setIsAudioEnabled(true)
        
        if (socket) {
          socket.emit("media-state-change", {
            roomId,
            userId,
            videoEnabled: isVideoEnabled,
            audioEnabled: true
          })
        }
      } catch (error) {
        console.error("Failed to re-enable audio:", error)
      }
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0]
        peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => 
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

        // Store the original stream for later restoration
        const originalStream = localStream
        setLocalStream(screenStream)
        setIsScreenSharing(true)

        // Notify other participants about screen sharing
        if (socket) {
          socket.emit("screen-share-started", {
            roomId,
            userId,
            userName
          })
        }

        // Handle screen share end
        videoTrack.onended = () => {
          stopScreenShare(originalStream)
        }
      } else {
        stopScreenShare()
      }
    } catch (error) {
      console.error("Error toggling screen share:", error)
      // Show user-friendly error message
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Screen sharing permission was denied. Please allow screen sharing to continue.')
      } else {
        alert('Failed to start screen sharing. Please try again.')
      }
    }
  }

  const stopScreenShare = async (originalStream?: MediaStream | null) => {
    try {
      // Stop current screen sharing stream
      if (localStream && isScreenSharing) {
        localStream.getTracks().forEach(track => track.stop())
      }

      // Get camera stream back or use the original stream
      let cameraStream = originalStream
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          }
        })
      }

      const videoTrack = cameraStream.getVideoTracks()[0]
      
      // Replace screen share track with camera track
      peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream
      }

      setLocalStream(cameraStream)
      setIsScreenSharing(false)

      // Notify other participants that screen sharing stopped
      if (socket) {
        socket.emit("screen-share-stopped", {
          roomId,
          userId,
          userName
        })
      }
    } catch (error) {
      console.error("Error stopping screen share:", error)
      setIsScreenSharing(false)
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative bg-gray-900 h-96">
      {/* Video Grid */}
      <div className={`grid gap-2 p-4 h-full ${
        participants.length === 0 ? 'grid-cols-1' :
        participants.length === 1 ? 'grid-cols-2' :
        participants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
        'grid-cols-3 grid-rows-2'
      }`}>
        {/* Local Video */}
        <Card className="relative overflow-hidden bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            You {isScreenSharing && "(Screen)"}
          </div>
          <div className="absolute top-2 right-2 flex space-x-1">
            {!isVideoEnabled && (
              <Badge variant="destructive" className="text-xs">
                <VideoOff className="w-3 h-3" />
              </Badge>
            )}
            {!isAudioEnabled && (
              <Badge variant="destructive" className="text-xs">
                <MicOff className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </Card>

        {/* Remote Videos */}
        {participants.map((participant) => (
          <Card key={participant.id} className="relative overflow-hidden bg-black">
            {participant.stream ? (
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                ref={(video) => {
                  if (video && participant.stream) {
                    video.srcObject = participant.stream
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {participant.name}
            </div>
            <div className="absolute top-2 right-2 flex space-x-1">
              {!participant.videoEnabled && (
                <Badge variant="destructive" className="text-xs">
                  <VideoOff className="w-3 h-3" />
                </Badge>
              )}
              {!participant.audioEnabled && (
                <Badge variant="destructive" className="text-xs">
                  <MicOff className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black/50 rounded-lg p-2">
        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="sm"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </Button>
        
        <Button
          variant={isAudioEnabled ? "default" : "destructive"}
          size="sm"
          onClick={toggleAudio}
        >
          {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        
        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="sm"
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={onLeave}
        >
          <Phone className="w-4 h-4" />
        </Button>
      </div>

      {/* Participant Count */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg flex items-center space-x-2">
        <Users className="w-4 h-4" />
        <span>{participants.length + 1}</span>
      </div>
    </div>
  )
}