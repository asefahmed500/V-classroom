"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, MonitorOff, Users, Volume2, VolumeX, 
  Maximize, Minimize, Settings, Share2, StopCircle,
  Play, Pause, RotateCcw, Download, Upload
} from 'lucide-react'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'

interface ScreenSharingProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
  isHost: boolean
  onScreenShareStart?: (stream: MediaStream) => void
  onScreenShareStop?: () => void
}

interface ScreenShareSession {
  userId: string
  userName: string
  isActive: boolean
  startTime: Date
  viewers: string[]
}

export function EnhancedScreenSharing({
  socket,
  roomId,
  userId,
  userName,
  isHost,
  onScreenShareStart,
  onScreenShareStop
}: ScreenSharingProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [currentSharer, setCurrentSharer] = useState<ScreenShareSession | null>(null)
  const [availableScreens, setAvailableScreens] = useState<MediaDeviceInfo[]>([])
  const [selectedScreen, setSelectedScreen] = useState<string>('')
  const [shareAudio, setShareAudio] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [shareQuality, setShareQuality] = useState<'low' | 'medium' | 'high'>('medium')
  
  const localScreenRef = useRef<HTMLVideoElement>(null)
  const remoteScreenRef = useRef<HTMLVideoElement>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Initialize screen sharing capabilities
  useEffect(() => {
    checkScreenSharingSupport()
    setupSocketListeners()
    
    return () => {
      stopScreenShare()
    }
  }, [socket])

  const checkScreenSharingSupport = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error('Screen sharing is not supported in this browser')
      return
    }

    try {
      // Get available screens/windows
      const devices = await navigator.mediaDevices.enumerateDevices()
      const screens = devices.filter(device => device.kind === 'videoinput')
      setAvailableScreens(screens)
    } catch (error) {
      console.error('Error checking screen sharing support:', error)
    }
  }

  const setupSocketListeners = () => {
    if (!socket) return

    socket.on('screen-share-started', (data) => {
      if (data.userId !== userId) {
        setCurrentSharer({
          userId: data.userId,
          userName: data.userName,
          isActive: true,
          startTime: new Date(),
          viewers: []
        })
        setIsViewing(true)
        toast.info(`${data.userName} started screen sharing`)
      }
    })

    socket.on('screen-share-stopped', (data) => {
      if (data.userId !== userId) {
        setCurrentSharer(null)
        setIsViewing(false)
        toast.info(`${data.userName} stopped screen sharing`)
      }
    })

    socket.on('screen-share-viewers', (data) => {
      setViewerCount(data.count)
      if (currentSharer) {
        setCurrentSharer(prev => prev ? { ...prev, viewers: data.viewers } : null)
      }
    })

    socket.on('screen-share-offer', async (data) => {
      if (data.to === userId) {
        await handleScreenShareOffer(data.offer, data.from)
      }
    })

    socket.on('screen-share-answer', async (data) => {
      if (data.to === userId) {
        await handleScreenShareAnswer(data.answer, data.from)
      }
    })

    socket.on('screen-share-ice-candidate', async (data) => {
      if (data.to === userId) {
        await handleScreenShareIceCandidate(data.candidate, data.from)
      }
    })
  }

  const getScreenShareConstraints = () => {
    const constraints: DisplayMediaStreamConstraints = {
      video: {
        cursor: 'always',
        displaySurface: 'monitor'
      } as any,
      audio: shareAudio
    }

    // Set quality based on selection
    switch (shareQuality) {
      case 'low':
        constraints.video = {
          ...constraints.video,
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 15 }
        } as any
        break
      case 'medium':
        constraints.video = {
          ...constraints.video,
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 }
        } as any
        break
      case 'high':
        constraints.video = {
          ...constraints.video,
          width: { max: 2560 },
          height: { max: 1440 },
          frameRate: { max: 60 }
        } as any
        break
    }

    return constraints
  }

  const startScreenShare = async () => {
    try {
      // Check if someone else is already sharing
      if (currentSharer && currentSharer.userId !== userId) {
        const shouldTakeover = confirm(
          `${currentSharer.userName} is currently sharing their screen. Do you want to take over?`
        )
        if (!shouldTakeover) return
      }

      const constraints = getScreenShareConstraints()
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints)
      
      screenStreamRef.current = stream
      
      if (localScreenRef.current) {
        localScreenRef.current.srcObject = stream
      }

      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      setIsSharing(true)
      
      // Notify other participants
      if (socket) {
        socket.emit('screen-share-started', {
          roomId,
          userId,
          userName
        })
      }

      // Set up WebRTC for sharing
      await setupScreenShareWebRTC(stream)
      
      if (onScreenShareStart) {
        onScreenShareStart(stream)
      }

      toast.success('Screen sharing started')
    } catch (error: any) {
      console.error('Error starting screen share:', error)
      
      if (error.name === 'NotAllowedError') {
        toast.error('Screen sharing permission denied')
      } else if (error.name === 'NotSupportedError') {
        toast.error('Screen sharing is not supported')
      } else {
        toast.error('Failed to start screen sharing')
      }
    }
  }

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localScreenRef.current) {
      localScreenRef.current.srcObject = null
    }

    setIsSharing(false)
    setCurrentSharer(null)

    if (socket) {
      socket.emit('screen-share-stopped', {
        roomId,
        userId
      })
    }

    if (onScreenShareStop) {
      onScreenShareStop()
    }

    toast.success('Screen sharing stopped')
  }

  const setupScreenShareWebRTC = async (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    // Add screen share stream
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream)
    })

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('screen-share-ice-candidate', {
          candidate: event.candidate,
          roomId,
          from: userId
        })
      }
    }

    // Create and send offer to all participants
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    if (socket) {
      socket.emit('screen-share-offer', {
        offer,
        roomId,
        from: userId
      })
    }
  }

  const handleScreenShareOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    if (isSharing) return // Don't receive if we're sharing

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteScreenRef.current) {
        remoteScreenRef.current.srcObject = remoteStream
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('screen-share-ice-candidate', {
          candidate: event.candidate,
          to: fromUserId,
          from: userId,
          roomId
        })
      }
    }

    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    if (socket) {
      socket.emit('screen-share-answer', {
        answer,
        to: fromUserId,
        from: userId,
        roomId
      })
    }
  }

  const handleScreenShareAnswer = async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer)
    }
  }

  const handleScreenShareIceCandidate = async (candidate: RTCIceCandidateInit, fromUserId: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(candidate)
    }
  }

  const toggleFullscreen = () => {
    const videoElement = isSharing ? localScreenRef.current : remoteScreenRef.current
    if (!videoElement) return

    if (!isFullscreen) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const requestControl = () => {
    if (socket && currentSharer) {
      socket.emit('screen-share-control-request', {
        roomId,
        from: userId,
        to: currentSharer.userId,
        userName
      })
      toast.info('Control request sent')
    }
  }

  return (
    <Card className="w-full h-full bg-gray-900 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Screen Sharing
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {viewerCount > 0 && (
              <Badge variant="secondary" className="text-gray-300">
                <Users className="w-3 h-3 mr-1" />
                {viewerCount} viewing
              </Badge>
            )}
            
            {isSharing && (
              <Badge className="bg-red-500 text-white">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                Sharing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          {!isSharing && !currentSharer && (
            <>
              <Button
                onClick={startScreenShare}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Start Sharing
              </Button>
              
              <select
                value={shareQuality}
                onChange={(e) => setShareQuality(e.target.value as any)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="low">Low Quality</option>
                <option value="medium">Medium Quality</option>
                <option value="high">High Quality</option>
              </select>
              
              <label className="flex items-center text-white text-sm">
                <input
                  type="checkbox"
                  checked={shareAudio}
                  onChange={(e) => setShareAudio(e.target.checked)}
                  className="mr-2"
                />
                Share Audio
              </label>
            </>
          )}

          {isSharing && (
            <Button
              onClick={stopScreenShare}
              variant="destructive"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop Sharing
            </Button>
          )}

          {(isSharing || isViewing) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white border-gray-600"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              
              {isViewing && !isSharing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestControl}
                  className="text-white border-gray-600"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Request Control
                </Button>
              )}
            </>
          )}
        </div>

        {/* Screen Share Display */}
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {isSharing && (
            <video
              ref={localScreenRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          )}

          {isViewing && !isSharing && (
            <video
              ref={remoteScreenRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          )}

          {!isSharing && !isViewing && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No screen sharing active</p>
                <p className="text-sm">Click "Start Sharing" to share your screen</p>
              </div>
            </div>
          )}

          {/* Overlay Info */}
          {(isSharing || isViewing) && (
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {isSharing ? 'Your Screen' : `${currentSharer?.userName}'s Screen`}
            </div>
          )}

          {isViewing && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Current Sharer Info */}
        {currentSharer && !isSharing && (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{currentSharer.userName} is sharing</p>
                <p className="text-gray-400 text-sm">
                  Started {currentSharer.startTime.toLocaleTimeString()}
                </p>
              </div>
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                <Users className="w-3 h-3 mr-1" />
                {currentSharer.viewers.length} viewers
              </Badge>
            </div>
          </div>
        )}

        {/* Tips */}
        {!isSharing && !isViewing && (
          <div className="bg-gray-800 rounded-lg p-3">
            <h4 className="text-white font-medium mb-2">Screen Sharing Tips:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Choose the right quality for your connection</li>
              <li>• Enable audio sharing for presentations with sound</li>
              <li>• Use fullscreen mode for better viewing</li>
              <li>• Only one person can share at a time</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}