"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Monitor, MonitorOff, Users, AlertCircle, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react"
import { Socket } from "socket.io-client"

interface ScreenSharingProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
}

interface ActiveShare {
  userId: string
  userName: string
  stream?: MediaStream
  isAudioEnabled: boolean
}

export function ScreenSharing({ socket, roomId, userId, userName }: ScreenSharingProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [activeShares, setActiveShares] = useState<Map<string, ActiveShare>>(new Map())
  const [selectedShare, setSelectedShare] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!socket) return

    socket.on('screen-share-started', ({ userId: sharingUserId, userName: sharingUserName, stream }) => {
      setActiveShares(prev => {
        const newShares = new Map(prev)
        newShares.set(sharingUserId, {
          userId: sharingUserId,
          userName: sharingUserName,
          stream,
          isAudioEnabled: true
        })
        
        // Auto-select first share if none selected
        if (!selectedShare && sharingUserId !== userId) {
          setSelectedShare(sharingUserId)
        }
        
        return newShares
      })
      
      if (sharingUserId === userId) {
        setIsSharing(true)
      }
    })

    socket.on('screen-share-stopped', ({ userId: stoppedUserId }) => {
      setActiveShares(prev => {
        const newShares = new Map(prev)
        newShares.delete(stoppedUserId)
        
        // Switch to another share if current one stopped
        if (selectedShare === stoppedUserId) {
          const remainingShares = Array.from(newShares.keys())
          setSelectedShare(remainingShares.length > 0 ? remainingShares[0] : null)
        }
        
        return newShares
      })
      
      if (stoppedUserId === userId) {
        setIsSharing(false)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
    })

    socket.on('screen-share-audio-toggle', ({ userId: toggleUserId, isAudioEnabled }) => {
      setActiveShares(prev => {
        const newShares = new Map(prev)
        const share = newShares.get(toggleUserId)
        if (share) {
          newShares.set(toggleUserId, { ...share, isAudioEnabled })
        }
        return newShares
      })
    })

    socket.on('screen-share-error', ({ error: errorMessage }) => {
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
    })

    return () => {
      socket.off('screen-share-started')
      socket.off('screen-share-stopped')
      socket.off('screen-share-audio-toggle')
      socket.off('screen-share-error')
    }
  }, [socket, userId, selectedShare])

  // Update video element when selected share changes
  useEffect(() => {
    if (videoRef.current && selectedShare) {
      const share = activeShares.get(selectedShare)
      if (share?.stream) {
        videoRef.current.srcObject = share.stream
      }
    }
  }, [selectedShare, activeShares])

  const startScreenShare = async () => {
    try {
      setError(null)
      
      // Check browser compatibility
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser')
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream
      setIsSharing(true)
      
      if (socket) {
        socket.emit('screen-share-started', { 
          roomId, 
          userId, 
          userName,
          hasAudio: stream.getAudioTracks().length > 0
        })
      }

      // Handle when user stops sharing via browser controls
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare()
        }
      }

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.onended = () => {
          stopScreenShare()
        }
      }

    } catch (error: any) {
      console.error('Error starting screen share:', error)
      
      let errorMessage = 'Failed to start screen sharing'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Screen sharing permission denied. Please allow screen sharing and try again.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Screen sharing is not supported in this browser.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No screen available for sharing.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      
      if (socket) {
        socket.emit('screen-share-error', { roomId, userId, error: errorMessage })
      }
    }
  }

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsSharing(false)
    if (socket) {
      socket.emit('screen-share-stopped', { roomId, userId })
    }
  }

  const toggleShareAudio = () => {
    if (streamRef.current && isSharing) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        
        if (socket) {
          socket.emit('screen-share-audio-toggle', { 
            roomId, 
            userId, 
            isAudioEnabled: audioTrack.enabled 
          })
        }
      }
    }
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const currentShare = selectedShare ? activeShares.get(selectedShare) : null
  const sharesList = Array.from(activeShares.values()).filter(share => share.userId !== userId)

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Screen Sharing</h3>
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
            <Users className="w-3 h-3 mr-1" />
            {activeShares.size}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Error Display */}
        {error && (
          <Card className="bg-red-900 border-red-700">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-100 text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Shares List */}
        {sharesList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-gray-300 text-sm font-medium">Active Shares</h4>
            {sharesList.map((share) => (
              <Card 
                key={share.userId}
                className={`cursor-pointer transition-colors ${
                  selectedShare === share.userId 
                    ? 'bg-blue-900 border-blue-700' 
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                }`}
                onClick={() => setSelectedShare(share.userId)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span className="text-white text-sm">{share.userName}</span>
                      {selectedShare === share.userId && (
                        <Badge variant="secondary" className="text-xs">Viewing</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {share.isAudioEnabled ? (
                        <Volume2 className="w-3 h-3 text-green-400" />
                      ) : (
                        <VolumeX className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Screen Share Viewer */}
        {currentShare && (
          <Card className="bg-black border-gray-600">
            <CardContent className="p-2">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 object-contain bg-black rounded"
                />
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                  {currentShare.userName}'s Screen
                </div>
                <div className="absolute top-2 right-2 flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="h-6 w-6 p-0 bg-black bg-opacity-70 hover:bg-opacity-90"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3 h-3 text-white" />
                    ) : (
                      <Maximize2 className="w-3 h-3 text-white" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Control Buttons */}
        <div className="space-y-2">
          <Button
            onClick={isSharing ? stopScreenShare : startScreenShare}
            className={`w-full ${
              isSharing 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSharing ? (
              <>
                <MonitorOff className="w-4 h-4 mr-2" />
                Stop Sharing
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 mr-2" />
                Share Screen
              </>
            )}
          </Button>

          {/* Audio Toggle for Own Share */}
          {isSharing && streamRef.current?.getAudioTracks().length > 0 && (
            <Button
              onClick={toggleShareAudio}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {streamRef.current?.getAudioTracks()[0]?.enabled ? (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Mute Screen Audio
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 mr-2" />
                  Unmute Screen Audio
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status Messages */}
        {isSharing && (
          <Card className="bg-green-900 border-green-700">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-green-400" />
                <span className="text-green-100 text-sm">You are sharing your screen</span>
              </div>
            </CardContent>
          </Card>
        )}

        {activeShares.size === 0 && !isSharing && (
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4 text-center">
              <Monitor className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-300 text-sm">No active screen shares</p>
              <p className="text-gray-400 text-xs mt-1">Click "Share Screen" to start sharing</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}