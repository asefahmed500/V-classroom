'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, MicOff, Video, VideoOff, Phone, Monitor, Users, MessageCircle, Send } from "lucide-react"

interface Participant {
  id: string
  name: string
  videoEnabled: boolean
  audioEnabled: boolean
  stream?: MediaStream
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
}

interface VideoChatProps {
  roomId: string
  userId: string
  userName: string
  onLeave: () => void
}

export function VideoChat({ roomId, userId, userName, onLeave }: VideoChatProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showChat, setShowChat] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map())
  const chatContainerRef = useRef<HTMLDivElement>(null)

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

    return () => {
      cleanup()
    }
  }, [])

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: { echoCancellation: true, noiseSuppression: true },
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

  const initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      console.log("Connected to video chat server")
      setIsConnected(true)
      setConnectionError(null)
      
      // Join room with provided username
      socketInstance.emit("join-room", roomId, userId, userName)
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from video chat server")
      setIsConnected(false)
    })

    socketInstance.on("user-connected", async (userData: { userId: string, userName: string }) => {
      console.log("User connected:", userData.userName)
      await createPeerConnection(userData.userId, true)
      
      // Show notification if page is not visible
      if (document.hidden) {
        new Notification(`${userData.userName} joined the room`, {
          icon: "/favicon.ico",
          tag: "user-joined"
        })
      }
    })

    socketInstance.on("user-disconnected", (userData: { userId: string, userName: string }) => {
      console.log("User disconnected:", userData.userName)
      removePeerConnection(userData.userId)
      
      // Show notification if page is not visible
      if (document.hidden) {
        new Notification(`${userData.userName} left the room`, {
          icon: "/favicon.ico",
          tag: "user-left"
        })
      }
    })

    socketInstance.on("offer", async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
      console.log("Received offer from:", fromUserId)
      await handleOffer(offer, fromUserId)
    })

    socketInstance.on("answer", async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
      console.log("Received answer from:", fromUserId)
      await handleAnswer(answer, fromUserId)
    })

    socketInstance.on("ice-candidate", async (candidate: RTCIceCandidateInit, fromUserId: string) => {
      console.log("Received ICE candidate from:", fromUserId)
      await handleIceCandidate(candidate, fromUserId)
    })

    socketInstance.on("chat-message", (data: { message: string, userId: string, userName: string, timestamp: string }) => {
      const chatMessage: ChatMessage = {
        id: `${data.userId}-${Date.now()}`,
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        timestamp: data.timestamp,
      }
      setChatMessages(prev => [...prev, chatMessage])
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 100)
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
          const existing = prev.find(p => p.id === remoteUserId)
          if (existing) {
            return prev.map(p => p.id === remoteUserId ? { ...p, stream: remoteStream } : p)
          } else {
            return [...prev, {
              id: remoteUserId,
              name: `User ${remoteUserId.slice(-4)}`,
              videoEnabled: true,
              audioEnabled: true,
              stream: remoteStream,
            }]
          }
        })
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("ice-candidate", roomId, event.candidate, userId)
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
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        if (socket) {
          socket.emit("offer", roomId, offer, userId)
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
          socket.emit("answer", roomId, answer, userId)
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
        video: true,
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
        video: { width: 640, height: 480 },
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
    } catch (error) {
      console.error("Error stopping screen share:", error)
    }
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

    // Disconnect socket
    if (socket) {
      socket.emit("leave-room", roomId, userId)
      socket.disconnect()
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return

    const messageData = {
      message: newMessage.trim(),
      userId,
      userName,
      timestamp: new Date().toISOString(),
    }

    socket.emit("chat-message", messageData.message, roomId, userId, userName)
    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLeave = () => {
    cleanup()
    onLeave()
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Main Video Area */}
      <div className="flex-1 p-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
            <Badge variant="outline">
              <Users className="w-3 h-3 mr-1" />
              {participants.length + 1} participants
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowChat(!showChat)}
              variant={showChat ? "default" : "outline"}
              size="sm"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            
            {connectionError && (
              <div className="text-red-400 text-sm">{connectionError}</div>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You {isScreenSharing && "(Screen)"}
            </div>
            <div className="absolute top-2 right-2 flex space-x-1">
              {!isVideoEnabled && (
                <div className="bg-red-500 p-1 rounded">
                  <VideoOff className="w-3 h-3 text-white" />
                </div>
              )}
              {!isAudioEnabled && (
                <div className="bg-red-500 p-1 rounded">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <RemoteVideo key={participant.id} participant={participant} />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="sm"
          >
            {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="sm"
          >
            {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>

          <Button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            variant={isScreenSharing ? "secondary" : "outline"}
            size="sm"
          >
            <Monitor className="w-4 h-4" />
          </Button>

          <Button onClick={handleLeave} variant="destructive" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Chat</h3>
          </div>
          
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`font-semibold ${msg.userId === userId ? 'text-blue-400' : 'text-green-400'}`}>
                    {msg.userId === userId ? 'You' : msg.userName}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-300 break-words">
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
          
          {/* Message Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 border-gray-600 text-white"
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface RemoteVideoProps {
  participant: Participant
}

function RemoteVideo({ participant }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {participant.name}
      </div>
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
      </div>
    </div>
  )
}