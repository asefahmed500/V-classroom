"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, MonitorOff, Users, Volume2, VolumeX, 
  Maximize, Minimize, Settings, StopCircle, Mic, MicOff,
  MoreVertical, Pin, PinOff, Fullscreen, FullscreenExit
} from 'lucide-react'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'

interface GoogleMeetScreenSharingProps {
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
  isPinned: boolean
}

export function GoogleMeetScreenSharing({
  socket,
  roomId,
  userId,
  userName,
  isHost,
  onScreenShareStart,
  onScreenShareStop
}: GoogleMeetScreenSharingProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [currentSharer, setCurrentSharer] = useState<ScreenShareSession | null>(null)
  const [shareAudio, setShareAudio] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [volume, setVolume] = useState([100])
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [quality, setQuality] = useState<'auto' | 'high' | 'medium' | 'low'>('auto')
  
  const localScreenRef = useRef<HTMLVideoElement>(null)
  const remoteScreenRef = useRef<HTMLVideoElement>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setupSocketListeners()
    return () => {
      stopScreenShare()
    }
  }, [socket])

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      setShowControls(true)
      controlsTimeoutRef.current = setTimeout(() => {
        if (isViewing || isSharing) {
          setShowControls(false)
        }
      }, 3000)
    }

    resetControlsTimeout()
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isViewing, isSharing])

  const setupSocketListeners = () => {
    if (!socket) return

    socket.on('screen-share-started', (data) => {
      if (data.userId !== userId) {
        setCurrentSharer({
          userId: data.userId,
          userName: data.userName,
          isActive: true,
          startTime: new Date(),
          viewers: [],
          isPinned: false
        })
        setIsViewing(true)
        toast.success(`${data.userName} started screen sharing`)
      }
    })

    socket.on('screen-share-stopped', (data) => {
      if (data.userId !== userId) {
        setCurrentSharer(null)
        setIsViewing(false)
        setIsPinned(false)
        toast.info(`${data.userName} stopped screen sharing`)
      }
    })

    socket.on('screen-share-viewers', (data) => {
      setViewerCount(data.count)
      if (currentSharer) {
        setCurrentSharer(prev => prev ? { ...prev, viewers: data.viewers } : null)
      }
    })

    // WebRTC signaling events would go here
  }

  const getQualityConstraints = () => {
    const baseConstraints = {
      video: {
        cursor: 'always' as const,
        displaySurface: 'monitor' as const
      },
      audio: shareAudio
    }

    switch (quality) {
      case 'high':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          }
        }
      case 'medium':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24 }
          }
        }
      case 'low':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 854 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
          }
        }
      default: // auto
        return baseConstraints
    }
  }

  const startScreenShare = async () => {
    try {
      if (currentSharer && currentSharer.userId !== userId) {
        const shouldTakeover = confirm(
          `${currentSharer.userName} is currently sharing. Take over screen sharing?`
        )
        if (!shouldTakeover) return
      }

      const constraints = getQualityConstraints()
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
      
      if (socket) {
        socket.emit('screen-share-started', {
          roomId,
          userId,
          userName,
          quality,
          hasAudio: shareAudio
        })
      }

      if (onScreenShareStart) {
        onScreenShareStart(stream)
      }

      toast.success('Screen sharing started')
    } catch (error: any) {
      console.error('Error starting screen share:', error)
      
      if (error.name === 'NotAllowedError') {
        toast.error('Screen sharing permission denied')
      } else if (error.name === 'NotSupportedError') {
        toast.error('Screen sharing not supported in this browser')
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
    setIsPinned(false)

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

  const toggleFullscreen = async () => {
    const videoElement = isSharing ? localScreenRef.current : remoteScreenRef.current
    if (!videoElement) return

    try {
      if (!isFullscreen) {
        if (videoElement.requestFullscreen) {
          await videoElement.requestFullscreen()
        }
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  const togglePin = () => {
    setIsPinned(!isPinned)
    if (socket) {
      socket.emit('screen-share-pin', {
        roomId,
        userId,
        isPinned: !isPinned
      })
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    const videoElement = remoteScreenRef.current
    if (videoElement) {
      videoElement.volume = newVolume[0] / 100
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    const videoElement = remoteScreenRef.current
    if (videoElement) {
      videoElement.muted = !isMuted
    }
  }

  const formatDuration = (startTime: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    const minutes = Math.floor(diff / 60)
    const seconds = diff % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!isSharing && !isViewing) {
    return (
      <Card className="w-full bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Share your screen</h3>
            <p className="text-gray-600 mb-6">
              Present slides, documents, or your entire screen to everyone in the meeting
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">Share audio</span>
                </div>
                <Button
                  variant={shareAudio ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareAudio(!shareAudio)}
                >
                  {shareAudio ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">Quality</span>
                </div>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="high">High (1080p)</option>
                  <option value="medium">Medium (720p)</option>
                  <option value="low">Low (480p)</option>
                </select>
              </div>
            </div>
            
            <Button
              onClick={startScreenShare}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Monitor className="w-5 h-5 mr-2" />
              Start sharing
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      {/* Video Display */}
      <div className="relative w-full h-full">
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
            muted={isMuted}
            volume={volume[0] / 100}
            className="w-full h-full object-contain"
          />
        )}

        {/* Overlay Controls */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          onMouseMove={() => setShowControls(true)}
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className="bg-red-500 text-white">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                  {isSharing ? 'Sharing' : 'Viewing'}
                </Badge>
                
                {currentSharer && (
                  <div className="text-white text-sm">
                    <span className="font-medium">{currentSharer.userName}</span>
                    <span className="text-gray-300 ml-2">
                      {formatDuration(currentSharer.startTime)}
                    </span>
                  </div>
                )}
                
                {viewerCount > 0 && (
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    <Users className="w-3 h-3 mr-1" />
                    {viewerCount}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!isSharing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePin}
                    className="text-white hover:bg-white/20"
                  >
                    {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  {isFullscreen ? <FullscreenExit className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {!isSharing && (
                      <>
                        <DropdownMenuItem onClick={toggleMute}>
                          {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                          {isMuted ? 'Unmute' : 'Mute'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setQuality('high')}>
                      <Settings className="w-4 h-4 mr-2" />
                      High Quality
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQuality('medium')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Medium Quality
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQuality('low')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Low Quality
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center justify-center space-x-4">
              {isSharing && (
                <Button
                  onClick={stopScreenShare}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop sharing
                </Button>
              )}

              {!isSharing && !isMuted && (
                <div className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-2">
                  <Volume2 className="w-4 h-4 text-white" />
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
            <Pin className="w-3 h-3 inline mr-1" />
            Pinned
          </div>
        )}
      </div>
    </div>
  )
}