"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone, PhoneOff,
  Users, MessageSquare, FileText, Palette, Bot, Settings, Share2,
  Send, Smile, Paperclip, Download, Upload, Save, Play, Pause,
  Square, Circle, Pen, Eraser, Type, RotateCcw, Trash2, Volume2,
  VolumeX, Camera, CameraOff, ScreenShare, ScreenShareOff,
  StopCircle, Maximize, Minimize, Grid3X3, User, Crown, Shield
} from 'lucide-react'
import { Socket, io } from 'socket.io-client'
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
  isRecording: boolean
  joinedAt: Date
  lastSeen: Date
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: 'text' | 'file' | 'system' | 'ai'
  reactions?: { [emoji: string]: string[] }
  isEdited?: boolean
  editedAt?: Date
}

interface WhiteboardStroke {
  id: string
  userId: string
  userName: string
  points: { x: number; y: number }[]
  color: string
  width: number
  tool: 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'
  timestamp: Date
}

interface FileShare {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedAt: Date
  downloadCount: number
}

interface RealTimeCollaborationRoomProps {
  roomId: string
  roomCode: string
  roomName: string
  userId: string
  userName: string
  isHost: boolean
  onLeave: () => void
}

export function RealTimeCollaborationRoom({
  roomId,
  roomCode,
  roomName,
  userId,
  userName,
  isHost,
  onLeave
}: RealTimeCollaborationRoomProps) {
  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  // Participants state
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentUser, setCurrentUser] = useState<Participant | null>(null)
  
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Whiteboard state
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'>('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [currentWidth, setCurrentWidth] = useState(2)
  
  // File sharing state
  const [sharedFiles, setSharedFiles] = useState<FileShare[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  
  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState('video')
  const [showParticipants, setShowParticipants] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [gridLayout, setGridLayout] = useState<'speaker' | 'grid' | 'sidebar'>('speaker')
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  
  // WebRTC connections
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  
  // Session data
  const { data: session } = useSession()

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = () => {
      const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true
      })

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id)
        setConnectionStatus('connected')
        setSocket(newSocket)
        
        // Join the room
        newSocket.emit('join-room', {
          roomId,
          userId,
          userName
        })
      })

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason)
        setConnectionStatus('disconnected')
        
        // Attempt to reconnect
        setTimeout(() => {
          if (newSocket.disconnected) {
            newSocket.connect()
          }
        }, 3000)
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        setConnectionStatus('disconnected')
      })

      // Room events
      newSocket.on('room-joined', (data) => {
        console.log('✅ Joined room:', data)
        setParticipants(data.participants || [])
        setCurrentUser(data.participants?.find((p: Participant) => p.id === userId) || null)
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
          isRecording: false,
          joinedAt: new Date(),
          lastSeen: new Date(),
          connectionStatus: 'connected'
        }])
        
        toast.success(`${data.userName} joined the room`)
      })

      newSocket.on('user-left', (data) => {
        console.log('👋 User left:', data)
        setParticipants(prev => prev.filter(p => p.id !== data.userId))
        
        // Clean up peer connection
        const peerConnection = peerConnections.current.get(data.userId)
        if (peerConnection) {
          peerConnection.close()
          peerConnections.current.delete(data.userId)
        }
        
        // Remove remote stream
        setRemoteStreams(prev => {
          const newStreams = new Map(prev)
          newStreams.delete(data.userId)
          return newStreams
        })
        
        toast.info(`${data.userName} left the room`)
      })

      // Chat events
      newSocket.on('chat-message', (message: ChatMessage) => {
        // Ensure timestamp is a Date object
        const messageWithDate = {
          ...message,
          timestamp: new Date(message.timestamp)
        }
        setChatMessages(prev => [...prev, messageWithDate])
        if (message.userId !== userId) {
          setUnreadCount(prev => prev + 1)
        }
        scrollToBottom()
      })

      newSocket.on('user-typing', (data) => {
        if (data.userId !== userId) {
          setIsTyping(prev => data.isTyping 
            ? [...prev.filter(id => id !== data.userId), data.userId]
            : prev.filter(id => id !== data.userId)
          )
        }
      })

      // Whiteboard events
      newSocket.on('whiteboard-stroke', (stroke: WhiteboardStroke) => {
        setWhiteboardStrokes(prev => [...prev, stroke])
        drawStrokeOnCanvas(stroke)
      })

      newSocket.on('whiteboard-clear', () => {
        setWhiteboardStrokes([])
        clearCanvas()
      })

      // File sharing events
      newSocket.on('file-shared', (file: FileShare) => {
        setSharedFiles(prev => [...prev, file])
        toast.success(`${file.uploadedBy} shared a file: ${file.name}`)
      })

      // WebRTC signaling
      newSocket.on('offer', async (data) => {
        await handleOffer(data.offer, data.from)
      })

      newSocket.on('answer', async (data) => {
        await handleAnswer(data.answer, data.from)
      })

      newSocket.on('ice-candidate', async (data) => {
        await handleIceCandidate(data.candidate, data.from)
      })

      // Media control events
      newSocket.on('user-media-changed', (data) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.userId 
            ? { ...p, video: data.video ?? p.video, audio: data.audio ?? p.audio }
            : p
        ))
      })

      return newSocket
    }

    const newSocket = initializeSocket()
    
    return () => {
      newSocket.disconnect()
    }
  }, [roomId, userId, userName])

  // Initialize media
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true }
        })
        
        setLocalStream(stream)
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        
        console.log('✅ Media initialized')
      } catch (error) {
        console.error('❌ Failed to initialize media:', error)
        toast.error('Failed to access camera/microphone')
      }
    }

    initializeMedia()
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

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

  // Auto-scroll chat
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, scrollToBottom])

  // Handle remote video streams
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.id !== userId && remoteStreams.has(participant.id)) {
        const video = document.getElementById(`remote-video-${participant.id}`) as HTMLVideoElement
        if (video) {
          video.srcObject = remoteStreams.get(participant.id) || null
        }
      }
    })
  }, [participants, remoteStreams, userId])

  // WebRTC functions
  const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
    
    const peerConnection = new RTCPeerConnection(configuration)
    
    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream)
      })
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream))
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: targetUserId,
          from: userId,
          roomId
        })
      }
    }
    
    peerConnections.current.set(targetUserId, peerConnection)
    return peerConnection
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    const peerConnection = createPeerConnection(fromUserId)
    
    try {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      
      if (socket) {
        socket.emit('answer', {
          answer,
          to: fromUserId,
          from: userId,
          roomId
        })
      }
    } catch (error) {
      console.error('Error handling offer:', error)
    }
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
    const peerConnection = peerConnections.current.get(fromUserId)
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(answer)
      } catch (error) {
        console.error('Error handling answer:', error)
      }
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, fromUserId: string) => {
    const peerConnection = peerConnections.current.get(fromUserId)
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(candidate)
      } catch (error) {
        console.error('Error handling ICE candidate:', error)
      }
    }
  }

  // Media controls
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        
        if (socket) {
          socket.emit('toggle-video', {
            roomId,
            userId,
            video: videoTrack.enabled
          })
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
          socket.emit('toggle-audio', {
            roomId,
            userId,
            audio: audioTrack.enabled
          })
        }
      }
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0]
      peerConnections.current.forEach(async (peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      })
      
      setIsScreenSharing(true)
      
      if (socket) {
        socket.emit('screen-share-started', {
          roomId,
          userId,
          userName
        })
      }
      
      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare()
      }
      
      toast.success('Screen sharing started')
    } catch (error) {
      console.error('Error starting screen share:', error)
      toast.error('Failed to start screen sharing')
    }
  }

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false
      })
      
      const videoTrack = cameraStream.getVideoTracks()[0]
      
      // Replace screen share track with camera track
      peerConnections.current.forEach(async (peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      })
      
      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream
      }
      
      setIsScreenSharing(false)
      
      if (socket) {
        socket.emit('screen-share-stopped', {
          roomId,
          userId
        })
      }
      
      toast.success('Screen sharing stopped')
    } catch (error) {
      console.error('Error stopping screen share:', error)
      toast.error('Failed to stop screen sharing')
    }
  }

  const startRecording = async () => {
    try {
      if (!localStream) return
      
      const mediaRecorder = new MediaRecorder(localStream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      recordedChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        })
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `room-recording-${new Date().toISOString()}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success('Recording saved!')
      }
      
      mediaRecorder.start(1000) // Collect data every second
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)
      
      toast.success('Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast.success('Recording stopped')
    }
  }

  // Chat functions
  const sendChatMessage = () => {
    if (!newMessage.trim() || !socket) return

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      userId,
      userName,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    }

    socket.emit('chat-message', {
      roomId,
      message
    })

    setChatMessages(prev => [...prev, message])
    setNewMessage('')
  }

  const handleTyping = (isTyping: boolean) => {
    if (socket) {
      socket.emit('user-typing', {
        roomId,
        userId,
        userName,
        isTyping
      })
    }
  }

  // Whiteboard functions
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
    stroke.points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y)
      } else {
        ctx.lineTo(point.x, point.y)
      }
    })
    ctx.stroke()
  }

  const clearCanvas = () => {
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleWhiteboardMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Start new stroke
    const newStroke: WhiteboardStroke = {
      id: `stroke_${Date.now()}_${Math.random()}`,
      userId,
      userName,
      points: [{ x, y }],
      color: currentColor,
      width: currentWidth,
      tool: currentTool,
      timestamp: new Date()
    }
    
    setWhiteboardStrokes(prev => [...prev, newStroke])
  }

  const handleWhiteboardMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = whiteboardCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setWhiteboardStrokes(prev => {
      const newStrokes = [...prev]
      const currentStroke = newStrokes[newStrokes.length - 1]
      if (currentStroke) {
        currentStroke.points.push({ x, y })
        drawStrokeOnCanvas(currentStroke)
        
        // Emit stroke update
        if (socket) {
          socket.emit('whiteboard-stroke', {
            roomId,
            stroke: currentStroke
          })
        }
      }
      return newStrokes
    })
  }

  const handleWhiteboardMouseUp = () => {
    setIsDrawing(false)
  }

  const clearWhiteboard = () => {
    if (socket) {
      socket.emit('whiteboard-clear', { roomId })
    }
    setWhiteboardStrokes([])
    clearCanvas()
  }

  // File sharing functions
  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('roomId', roomId)
      formData.append('userId', userId)
      formData.append('userName', userName)
      
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
        
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          const fileShare: FileShare = {
            id: result.fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            url: result.url,
            uploadedBy: userName,
            uploadedAt: new Date(),
            downloadCount: 0
          }
          
          setSharedFiles(prev => [...prev, fileShare])
          
          if (socket) {
            socket.emit('file-shared', {
              roomId,
              file: fileShare
            })
          }
          
          toast.success(`File "${file.name}" uploaded successfully`)
        } else {
          throw new Error('Upload failed')
        }
      } catch (error) {
        console.error('File upload error:', error)
        toast.error(`Failed to upload "${file.name}"`)
      } finally {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[file.name]
          return newProgress
        })
      }
    }
  }

  // AI Assistant functions
  const askAI = async () => {
    if (!aiInput.trim()) return
    
    setIsAiLoading(true)
    
    const userMessage: ChatMessage = {
      id: `ai_user_${Date.now()}`,
      userId,
      userName,
      message: aiInput.trim(),
      timestamp: new Date(),
      type: 'text'
    }
    
    setAiMessages(prev => [...prev, userMessage])
    
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiInput.trim(),
          context: 'study-room',
          roomId,
          userId
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        const aiMessage: ChatMessage = {
          id: `ai_response_${Date.now()}`,
          userId: 'ai-assistant',
          userName: 'AI Assistant',
          message: result.response,
          timestamp: new Date(),
          type: 'ai'
        }
        
        setAiMessages(prev => [...prev, aiMessage])
        
        // Optionally share AI response with room
        if (socket) {
          socket.emit('ai-message-shared', {
            roomId,
            userMessage: userMessage.message,
            aiMessage: aiMessage.message,
            sharedBy: userName
          })
        }
      } else {
        throw new Error('AI request failed')
      }
    } catch (error) {
      console.error('AI request error:', error)
      toast.error('Failed to get AI response')
    } finally {
      setIsAiLoading(false)
      setAiInput('')
    }
  }

  // Room management functions
  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room', { roomId, userId })
    }
    
    // Clean up media
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    // Clean up peer connections
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    
    onLeave()
  }

  const deleteRoom = async () => {
    if (!isHost) return
    
    const confirmed = confirm('Are you sure you want to delete this room? All participants will be removed.')
    if (!confirmed) return
    
    try {
      if (socket) {
        socket.emit('room-deleted', { roomId })
      }
      
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        toast.success('Room deleted successfully')
        onLeave()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete room')
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      toast.error('Failed to delete room')
    }
  }

  // Utility functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'reconnecting': return 'bg-orange-500'
      default: return 'bg-red-500'
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">{roomName}</h1>
            <Badge variant="secondary" className="bg-gray-700">
              {roomCode}
            </Badge>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor(connectionStatus)}`} />
              <span className="text-sm text-gray-400">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
                <Circle className="w-3 h-3 fill-current animate-pulse" />
                <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
            
            {/* Media controls */}
            <Button
              variant={isVideoEnabled ? "secondary" : "destructive"}
              size="sm"
              onClick={toggleVideo}
              className="p-2"
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isAudioEnabled ? "secondary" : "destructive"}
              size="sm"
              onClick={toggleAudio}
              className="p-2"
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="sm"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className="p-2"
            >
              {isScreenSharing ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              className="p-2"
            >
              {isRecording ? <StopCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setGridLayout(gridLayout === 'grid' ? 'speaker' : 'grid')}
              className="p-2"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={leaveRoom}
              className="p-2"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
            
            {isHost && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteRoom}
                className="p-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={`flex-1 flex flex-col bg-black overflow-hidden ${
          gridLayout === 'speaker' ? 'p-4' : 
          gridLayout === 'grid' ? 'p-4' : 'flex-col'
        }`}>
          {/* Main Video Grid */}
          <div className={`flex-1 ${
            gridLayout === 'speaker' ? 'aspect-video' : 
            gridLayout === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 gap-2' : 'h-full'
          } bg-gray-800 rounded-lg overflow-hidden`}>
            
            {/* Local Video */}
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                {userName} (You)
                {isHost && <Crown className="inline ml-1 w-3 h-3 text-yellow-400" />}
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
            {participants.filter(p => p.id !== userId).map((participant) => (
              <div key={participant.id} className="relative">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  id={`remote-video-${participant.id}`}
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                  {participant.name}
                  {participant.isHost && <Crown className="inline ml-1 w-3 h-3 text-yellow-400" />}
                </div>
                <div className="absolute top-2 right-2 flex space-x-1">
                  {!participant.video && (
                    <div className="bg-red-500 p-1 rounded">
                      <VideoOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {!participant.audio && (
                    <div className="bg-red-500 p-1 rounded">
                      <MicOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 bg-gray-700">
              <TabsTrigger value="chat" className="relative">
                <MessageSquare className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-xs px-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="participants">
                <Users className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="whiteboard">
                <Palette className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="files">
                <FileText className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Bot className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col p-4">
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-2 rounded-lg ${
                      message.userId === userId
                        ? 'bg-blue-600 text-white ml-8'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">
                      {message.userName} • {message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString() : new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm">{message.message}</div>
                  </div>
                ))}
                {isTyping.length > 0 && (
                  <div className="text-xs text-gray-400 italic">
                    {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping(e.target.value.length > 0)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                />
                <Button onClick={sendChatMessage} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="participants" className="flex-1 p-4">
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''} in room
                </div>
              </div>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {participant.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${getConnectionStatusColor(participant.connectionStatus)}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">{participant.name}</span>
                          {participant.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                          {participant.id === userId && <span className="text-xs text-gray-400">(You)</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {participant.connectionStatus === 'connected' ? 'Online' :
                           participant.connectionStatus === 'connecting' ? 'Connecting...' :
                           participant.connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                           'Offline'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={`p-1 rounded ${participant.video ? 'bg-green-600' : 'bg-red-600'}`}>
                        {participant.video ? <Video className="w-3 h-3 text-white" /> : <VideoOff className="w-3 h-3 text-white" />}
                      </div>
                      <div className={`p-1 rounded ${participant.audio ? 'bg-green-600' : 'bg-red-600'}`}>
                        {participant.audio ? <Mic className="w-3 h-3 text-white" /> : <MicOff className="w-3 h-3 text-white" />}
                      </div>
                      {participant.isScreenSharing && (
                        <div className="p-1 rounded bg-blue-600">
                          <Monitor className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Whiteboard Tab */}
            <TabsContent value="whiteboard" className="flex-1 flex flex-col p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Button
                  variant={currentTool === 'pen' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setCurrentTool('pen')}
                >
                  <Pen className="w-4 h-4" />
                </Button>
                <Button
                  variant={currentTool === 'eraser' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setCurrentTool('eraser')}
                >
                  <Eraser className="w-4 h-4" />
                </Button>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="w-8 h-8 rounded border-0"
                />
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentWidth}
                  onChange={(e) => setCurrentWidth(Number(e.target.value))}
                  className="flex-1"
                />
                <Button variant="destructive" size="sm" onClick={clearWhiteboard}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 bg-white rounded">
                <canvas
                  ref={whiteboardCanvasRef}
                  width={300}
                  height={400}
                  className="w-full h-full cursor-crosshair"
                  onMouseDown={handleWhiteboardMouseDown}
                  onMouseMove={handleWhiteboardMouseMove}
                  onMouseUp={handleWhiteboardMouseUp}
                />
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 flex flex-col p-4">
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  variant="secondary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {sharedFiles.map((file) => (
                  <div key={file.id} className="p-2 bg-gray-700 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-gray-400">
                          {file.uploadedBy} • {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" asChild>
                        <a href={file.url} download={file.name}>
                          <Download className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* AI Assistant Tab */}
            <TabsContent value="ai" className="flex-1 flex flex-col p-4">
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-2 rounded-lg ${
                      message.type === 'ai'
                        ? 'bg-purple-600 text-white'
                        : message.userId === userId
                        ? 'bg-blue-600 text-white ml-8'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">
                      {message.userName} • {message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString() : new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm">{message.message}</div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="text-center text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    AI is thinking...
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAiLoading && askAI()}
                  placeholder="Ask AI a question..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                  disabled={isAiLoading}
                />
                <Button onClick={askAI} size="sm" disabled={isAiLoading}>
                  <Bot className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
