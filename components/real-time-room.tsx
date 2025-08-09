"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone, 
  Users, MessageSquare, FileText, Settings, Share2, 
  PenTool, Eraser, Square, Circle, Type, Save, Download,
  Send, Smile, Paperclip, MoreVertical, Maximize, Minimize,
  VolumeX, Volume2, Camera, CameraOff, ScreenShare, StopCircle,
  Record, Pause, Play, Trash2, Edit3, Copy, Eye, EyeOff
} from 'lucide-react'
import { Socket, io } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface Participant {
  id: string
  name: string
  email?: string
  isHost: boolean
  isGuest: boolean
  video: boolean
  audio: boolean
  isScreenSharing: boolean
  socketId: string
  stream?: MediaStream
  peerConnection?: RTCPeerConnection
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  type: 'text' | 'file' | 'system'
  reactions?: { [emoji: string]: string[] }
  isEdited?: boolean
  replyTo?: string
}

interface WhiteboardStroke {
  id: string
  userId: string
  userName: string
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'
  points: number[]
  color: string
  width: number
  timestamp: number
}

interface RealTimeRoomProps {
  roomId: string
  roomCode: string
  roomName: string
  userId: string
  userName: string
  isHost: boolean
  onLeave: () => void
}

export function RealTimeRoom({ 
  roomId, 
  roomCode, 
  roomName, 
  userId, 
  userName, 
  isHost, 
  onLeave 
}: RealTimeRoomProps) {
  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  
  // UI state
  const [activeTab, setActiveTab] = useState('video')
  const [showParticipants, setShowParticipants] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  // Whiteboard state
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen')
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  
  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<any[]>([])
  const [aiInput, setAiInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  
  const { data: session } = useSession()

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true
    })

    newSocket.on('connect', () => {
      console.log('🔌 Connected to server')
      setIsConnected(true)
      setSocket(newSocket)
      
      // Join the room
      newSocket.emit('join-room', {
        roomId,
        userId,
        userName
      })
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from server')
      setIsConnected(false)
    })

    newSocket.on('room-joined', (data) => {
      console.log('🏠 Joined room:', data)
      setParticipants(data.participants || [])
      toast.success('Connected to room')
    })

    newSocket.on('user-joined', (data) => {
      console.log('👤 User joined:', data)
      setParticipants(prev => [...prev.filter(p => p.id !== data.userId), {
        id: data.userId,
        name: data.userName,
        isHost: data.isHost || false,
        isGuest: data.isGuest || false,
        video: true,
        audio: true,
        isScreenSharing: false,
        socketId: data.socketId
      }])
      toast.success(`${data.userName} joined the room`)
    })

    newSocket.on('user-left', (data) => {
      console.log('👤 User left:', data)
      setParticipants(prev => prev.filter(p => p.id !== data.userId))
      toast.info(`${data.userName} left the room`)
    })

    newSocket.on('user-media-changed', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId 
          ? { ...p, video: data.video ?? p.video, audio: data.audio ?? p.audio }
          : p
      ))
    })

    // Chat events
    newSocket.on('chat-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message])
    })

    newSocket.on('user-typing', (data) => {
      if (data.userId !== userId) {
        setTypingUsers(prev => 
          data.isTyping 
            ? [...prev.filter(u => u !== data.userName), data.userName]
            : prev.filter(u => u !== data.userName)
        )
      }
    })

    // Whiteboard events
    newSocket.on('whiteboard-update', (stroke: WhiteboardStroke) => {
      setWhiteboardStrokes(prev => [...prev, stroke])
      drawStrokeOnCanvas(stroke)
    })

    newSocket.on('whiteboard-clear', () => {
      setWhiteboardStrokes([])
      clearCanvas()
    })

    // WebRTC signaling
    newSocket.on('offer', handleOffer)
    newSocket.on('answer', handleAnswer)
    newSocket.on('ice-candidate', handleIceCandidate)

    // Screen sharing events
    newSocket.on('screen-share-started', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, isScreenSharing: true } : p
      ))
    })

    newSocket.on('screen-share-stopped', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, isScreenSharing: false } : p
      ))
    })

    return () => {
      newSocket.disconnect()
    }
  }, [roomId, userId, userName])

  // Initialize local media
  useEffect(() => {
    initializeMedia()
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to get media:', error)
      toast.error('Failed to access camera/microphone')
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
        
        socket?.emit('toggle-video', {
          roomId,
          userId,
          video: videoTrack.enabled
        })
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
        
        socket?.emit('toggle-audio', {
          roomId,
          userId,
          audio: audioTrack.enabled
        })
      }
    }
  }

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })
      
      setScreenStream(stream)
      setIsScreenSharing(true)
      
      socket?.emit('screen-share-started', {
        roomId,
        userId,
        userName
      })
      
      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }
      
      toast.success('Screen sharing started')
    } catch (error) {
      console.error('Failed to start screen share:', error)
      toast.error('Failed to start screen sharing')
    }
  }

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      setScreenStream(null)
    }
    
    setIsScreenSharing(false)
    
    socket?.emit('screen-share-stopped', {
      roomId,
      userId
    })
    
    toast.info('Screen sharing stopped')
  }

  const sendChatMessage = () => {
    if (!newMessage.trim() || !socket) return

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      userId,
      userName,
      message: newMessage.trim(),
      timestamp: Date.now(),
      type: 'text'
    }

    socket.emit('chat-message', {
      roomId,
      message
    })

    setNewMessage('')
    setIsTyping(false)
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (!isTyping && value.length > 0) {
      setIsTyping(true)
      socket?.emit('user-typing', {
        roomId,
        userId,
        userName,
        isTyping: true
      })
    } else if (isTyping && value.length === 0) {
      setIsTyping(false)
      socket?.emit('user-typing', {
        roomId,
        userId,
        userName,
        isTyping: false
      })
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      const chunks: BlobPart[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `room-recording-${roomCode}-${new Date().toISOString()}.webm`
        a.click()
        URL.revokeObjectURL(url)
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
      
      toast.success('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setMediaRecorder(null)
      setIsRecording(false)
      toast.success('Recording saved')
    }
  }

  const clearWhiteboard = () => {
    setWhiteboardStrokes([])
    clearCanvas()
    socket?.emit('whiteboard-clear', { roomId })
  }

  const clearCanvas = () => {
    const canvas = whiteboardCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const drawStrokeOnCanvas = (stroke: WhiteboardStroke) => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }
    
    ctx.beginPath()
    for (let i = 0; i < stroke.points.length - 1; i += 2) {
      const x = stroke.points[i]
      const y = stroke.points[i + 1]
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  const handleWhiteboardDraw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const stroke: WhiteboardStroke = {
      id: `stroke_${Date.now()}_${Math.random()}`,
      userId,
      userName,
      tool: selectedTool,
      points: [x, y],
      color: selectedColor,
      width: strokeWidth,
      timestamp: Date.now()
    }
    
    socket?.emit('whiteboard-update', {
      roomId,
      ...stroke
    })
    
    drawStrokeOnCanvas(stroke)
  }

  const askAI = async () => {
    if (!aiInput.trim()) return
    
    setIsAiLoading(true)
    
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiInput,
          context: {
            roomId,
            roomName,
            participants: participants.length,
            currentTab: activeTab
          }
        })
      })
      
      const data = await response.json()
      
      setAiMessages(prev => [...prev, {
        id: Date.now(),
        type: 'user',
        message: aiInput
      }, {
        id: Date.now() + 1,
        type: 'ai',
        message: data.response
      }])
      
      setAiInput('')
    } catch (error) {
      console.error('AI request failed:', error)
      toast.error('AI assistant is not available')
    } finally {
      setIsAiLoading(false)
    }
  }

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room', { roomId, userId })
      socket.disconnect()
    }
    
    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
    }
    
    onLeave()
  }

  const deleteRoom = async () => {
    if (!isHost) return
    
    const confirmed = confirm('Are you sure you want to delete this room? All participants will be removed.')
    if (!confirmed) return
    
    try {
      socket?.emit('room-deleted', { roomId })
      
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Room deleted successfully')
        onLeave()
      } else {
        throw new Error('Failed to delete room')
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      toast.error('Failed to delete room')
    }
  }

  // WebRTC handlers (simplified for brevity)
  const handleOffer = async (data: any) => {
    // WebRTC offer handling logic
  }

  const handleAnswer = async (data: any) => {
    // WebRTC answer handling logic
  }

  const handleIceCandidate = async (data: any) => {
    // WebRTC ICE candidate handling logic
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <h1 className="text-white font-semibold text-lg">{roomName}</h1>
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                {roomCode}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{participants.length + 1} participants</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Recording controls */}
            {isRecording ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                </div>
                <Button onClick={stopRecording} size="sm" variant="destructive">
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              </div>
            ) : (
              <Button onClick={startRecording} size="sm" variant="outline">
                <Record className="w-4 h-4 mr-1" />
                Record
              </Button>
            )}

            {/* Room controls */}
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              size="sm"
              variant="outline"
            >
              <Users className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setShowChat(!showChat)}
              size="sm"
              variant="outline"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>

            {isHost && (
              <Button onClick={deleteRoom} size="sm" variant="destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <Button onClick={leaveRoom} size="sm" variant="destructive">
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Video area */}
          <div className="flex-1 bg-black relative">
            {/* Local video */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden z-10">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                You {!isVideoOn && '(Camera Off)'}
              </div>
            </div>

            {/* Screen share or main video grid */}
            {isScreenSharing || participants.some(p => p.isScreenSharing) ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white text-center">
                  <Monitor className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg">Screen is being shared</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-4 h-full">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="bg-gray-800 rounded-lg overflow-hidden relative"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {participant.video ? (
                        <div className="text-white text-center">
                          <Camera className="w-12 h-12 mx-auto mb-2" />
                          <p>{participant.name}</p>
                        </div>
                      ) : (
                        <div className="text-white text-center">
                          <CameraOff className="w-12 h-12 mx-auto mb-2" />
                          <p>{participant.name} (Camera Off)</p>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                      {participant.name}
                      {!participant.audio && <MicOff className="w-3 h-3 inline ml-1" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media controls */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={toggleAudio}
                size="lg"
                variant={isAudioOn ? "outline" : "destructive"}
                className="rounded-full w-12 h-12"
              >
                {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                onClick={toggleVideo}
                size="lg"
                variant={isVideoOn ? "outline" : "destructive"}
                className="rounded-full w-12 h-12"
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                size="lg"
                variant={isScreenSharing ? "default" : "outline"}
                className="rounded-full w-12 h-12"
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>

              <Button
                onClick={() => setActiveTab(activeTab === 'whiteboard' ? 'video' : 'whiteboard')}
                size="lg"
                variant="outline"
                className="rounded-full w-12 h-12"
              >
                <PenTool className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {(showParticipants || showChat) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 bg-gray-700">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="whiteboard">Board</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex space-x-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                        {message.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white text-sm font-medium">{message.userName}</span>
                          <span className="text-gray-400 text-xs">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{message.message}</p>
                      </div>
                    </div>
                  ))}
                  
                  {typingUsers.length > 0 && (
                    <div className="text-gray-400 text-sm italic">
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-700 border-gray-600 text-white"
                    />
                    <Button onClick={sendChatMessage} size="sm">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Whiteboard Tab */}
              <TabsContent value="whiteboard" className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Whiteboard</h3>
                    <Button onClick={clearWhiteboard} size="sm" variant="outline">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <Button
                      onClick={() => setSelectedTool('pen')}
                      size="sm"
                      variant={selectedTool === 'pen' ? 'default' : 'outline'}
                    >
                      <PenTool className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setSelectedTool('eraser')}
                      size="sm"
                      variant={selectedTool === 'eraser' ? 'default' : 'outline'}
                    >
                      <Eraser className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setSelectedTool('rectangle')}
                      size="sm"
                      variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setSelectedTool('circle')}
                      size="sm"
                      variant={selectedTool === 'circle' ? 'default' : 'outline'}
                    >
                      <Circle className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-600"
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="flex-1 p-4">
                  <canvas
                    ref={whiteboardCanvasRef}
                    width={300}
                    height={400}
                    className="w-full h-full bg-white rounded border border-gray-600 cursor-crosshair"
                    onMouseDown={() => setIsDrawing(true)}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseMove={handleWhiteboardDraw}
                    onMouseLeave={() => setIsDrawing(false)}
                  />
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="flex-1 flex flex-col">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Shared Files</h3>
                    <Button onClick={() => fileInputRef.current?.click()} size="sm">
                      <Paperclip className="w-4 h-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      // Handle file upload
                      console.log('Files selected:', e.target.files)
                    }}
                  />
                  
                  <div className="text-gray-400 text-sm text-center py-8">
                    No files shared yet
                  </div>
                </div>
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai" className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {aiMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <Input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && askAI()}
                      placeholder="Ask AI assistant..."
                      className="flex-1 bg-gray-700 border-gray-600 text-white"
                      disabled={isAiLoading}
                    />
                    <Button onClick={askAI} size="sm" disabled={isAiLoading}>
                      {isAiLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}