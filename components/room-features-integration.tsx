"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, 
  Phone, Users, MessageCircle, FileText, PenTool, 
  Settings, Play, Pause, Square, Download, Upload,
  Maximize, Minimize, Volume2, VolumeX, Grid3X3,
  Save, RotateCcw, Palette, Type, Eraser, Circle,
  Clock, Trophy, Brain, BookOpen
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface RoomFeaturesProps {
  roomId: string
  userId: string
  userName: string
  roomData: any
  onLeave: () => void
}

export function RoomFeaturesIntegration({ roomId, userId, userName, roomData, onLeave }: RoomFeaturesProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activeFeature, setActiveFeature] = useState('video')
  const [participants, setParticipants] = useState<any[]>([])
  
  // Video Chat States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map())
  
  // Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  
  // Whiteboard States
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle'>('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(2)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Socket Connection
  useEffect(() => {
    const initSocket = () => {
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
      })

      socketInstance.on("connect", () => {
        console.log("Connected to room features socket")
        socketInstance.emit("join-room", roomId, userId, userName)
      })

      socketInstance.on("user-joined", (user: any) => {
        setParticipants(prev => [...prev.filter(p => p.id !== user.id), user])
        createPeerConnection(user.id, true)
      })

      socketInstance.on("user-left", ({ userId: leftUserId }) => {
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

      // Whiteboard events
      socketInstance.on("whiteboard-drawing", (drawingData: any) => {
        if (drawingData.userId !== userId) {
          drawOnCanvas(drawingData)
        }
      })

      socketInstance.on("whiteboard-clear", () => {
        clearCanvas()
      })

      // Recording events
      socketInstance.on("recording-started", ({ userId: recordingUserId, userName: recordingUserName }) => {
        if (recordingUserId !== userId) {
          // Show notification that recording started
          console.log(`${recordingUserName} started recording`)
        }
      })

      socketInstance.on("recording-stopped", ({ userId: recordingUserId }) => {
        if (recordingUserId !== userId) {
          console.log("Recording stopped")
        }
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
        peerConnections.forEach(pc => pc.close())
      }
    }

    initSocket()
  }, [roomId, userId, userName])

  // Initialize Media Stream
  useEffect(() => {
    const initMedia = async () => {
      try {
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
        setIsVideoEnabled(false)
        setIsAudioEnabled(false)
      }
    }

    if (socket) {
      initMedia()
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [socket])

  // WebRTC Functions
  const createPeerConnection = (peerId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    })

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      setParticipants(prev => 
        prev.map(p => 
          p.id === peerId ? { ...p, stream: remoteStream } : p
        )
      )
    }

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

  // Media Controls
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

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        })
        
        const videoTrack = screenStream.getVideoTracks()[0]
        peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          )
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        setIsScreenSharing(true)

        videoTrack.onended = () => {
          stopScreenShare()
        }
      } else {
        stopScreenShare()
      }
    } catch (error) {
      console.error("Screen share error:", error)
    }
  }

  const stopScreenShare = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      })

      const videoTrack = cameraStream.getVideoTracks()[0]
      peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream
      }

      setIsScreenSharing(false)
    } catch (error) {
      console.error("Stop screen share error:", error)
    }
  }

  // Recording Functions
  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      const mediaRecorder = new MediaRecorder(screenStream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        screenStream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)

      // Notify other participants
      if (socket) {
        socket.emit("recording-started", { roomId, userId, userName })
      }

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Recording error:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (socket) {
        socket.emit("recording-stopped", { roomId, userId })
      }
    }
  }

  // Whiteboard Functions
  const drawOnCanvas = (drawingData: any) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.strokeStyle = drawingData.color
    ctx.lineWidth = drawingData.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (drawingData.points.length > 1) {
      ctx.beginPath()
      ctx.moveTo(drawingData.points[0].x, drawingData.points[0].y)
      
      for (let i = 1; i < drawingData.points.length; i++) {
        ctx.lineTo(drawingData.points[i].x, drawingData.points[i].y)
      }
      
      ctx.stroke()
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">{roomData.name}</h1>
            <Badge variant="outline">
              <Users className="w-3 h-3 mr-1" />
              {participants.length + 1} participants
            </Badge>
            {isRecording && (
              <Badge className="bg-red-600 text-white animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                REC {formatTime(recordingTime)}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button onClick={onLeave} variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <Tabs value={activeFeature} onValueChange={setActiveFeature} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 p-1 m-2">
            <TabsTrigger value="video">
              <Video className="w-4 h-4 mr-2" />
              Video Chat
            </TabsTrigger>
            <TabsTrigger value="whiteboard">
              <PenTool className="w-4 h-4 mr-2" />
              Whiteboard
            </TabsTrigger>
            <TabsTrigger value="recording">
              <Video className="w-4 h-4 mr-2" />
              Recording
            </TabsTrigger>
            <TabsTrigger value="features">
              <Settings className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            {/* Video Chat Tab */}
            <TabsContent value="video" className="h-full m-0">
              <div className="relative bg-gray-900 h-full">
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
                    </Card>
                  ))}
                </div>

                {/* Video Controls */}
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
                </div>
              </div>
            </TabsContent>

            {/* Whiteboard Tab */}
            <TabsContent value="whiteboard" className="h-full m-0">
              <div className="h-full flex flex-col bg-white">
                {/* Whiteboard Toolbar */}
                <div className="border-b border-gray-200 p-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={currentTool === "pen" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentTool("pen")}
                    >
                      <PenTool className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={currentTool === "eraser" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentTool("eraser")}
                    >
                      <Eraser className="w-4 h-4" />
                    </Button>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="w-8 h-8 rounded border"
                    />
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative">
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    width={800}
                    height={600}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Recording Tab */}
            <TabsContent value="recording" className="h-full m-0 p-4">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="w-5 h-5 mr-2" />
                    Session Recording
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {isRecording ? 'Recording Time' : 'Ready to Record'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatTime(recordingTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button
                        onClick={startRecording}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                  </div>

                  {recordedBlob && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const url = URL.createObjectURL(recordedBlob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `room-${roomId}-recording.webm`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="h-full m-0 p-4">
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Video className="w-4 h-4 mr-2" />
                      Video Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">HD video calls with screen sharing support</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <PenTool className="w-4 h-4 mr-2" />
                      Whiteboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Collaborative drawing and brainstorming</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Video className="w-4 h-4 mr-2" />
                      Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">Record sessions for later review</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}