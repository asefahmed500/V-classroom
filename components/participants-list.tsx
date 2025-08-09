"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Crown, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Hand, 
  MoreVertical,
  UserPlus,
  Volume2,
  VolumeX
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Participant {
  id: string
  name: string
  email?: string
  isHost: boolean
  videoEnabled: boolean
  audioEnabled: boolean
  isScreenSharing?: boolean
  isSpeaking?: boolean
  isHandRaised?: boolean
  joinedAt?: string
  isActive?: boolean
}

interface ParticipantsListProps {
  participants: Participant[]
  roomId?: string
  currentUserId?: string
}

export function ParticipantsList({ participants, roomId, currentUserId }: ParticipantsListProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [localParticipants, setLocalParticipants] = useState<Participant[]>(participants)

  useEffect(() => {
    setLocalParticipants(participants)
  }, [participants])

  useEffect(() => {
    if (roomId) {
      initializeSocket()
    }

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [roomId])

  const initializeSocket = () => {
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
      console.log("Attempting participants connection to:", socketUrl)
      
      const socketInstance = io(socketUrl, {
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      })

      setSocket(socketInstance)

      socketInstance.on("connect", () => {
        console.log("Participants connected to Socket.IO server")
        if (roomId && currentUserId) {
          socketInstance.emit("join-room", roomId, currentUserId)
        }
      })

      socketInstance.on("connect_error", (error) => {
        console.error("Participants connection error:", error)
      })

      socketInstance.on("user-joined", (userData: any) => {
        if (userData && userData.id) {
          setLocalParticipants(prev => {
            const exists = prev.find(p => p.id === userData.id)
            if (exists) return prev
            
            return [...prev, {
              id: userData.id,
              name: userData.name || 'Anonymous',
              isHost: false,
              videoEnabled: userData.videoEnabled || true,
              audioEnabled: userData.audioEnabled || true,
              isActive: true,
              joinedAt: new Date().toISOString(),
            }]
          })
        }
      })

      socketInstance.on("user-left", (userData: any) => {
        if (userData && userData.userId) {
          setLocalParticipants(prev => prev.filter(p => p.id !== userData.userId))
        }
      })

      socketInstance.on("user-video-toggle", (data: any) => {
        if (data && data.userId) {
          setLocalParticipants(prev => prev.map(p => 
            p.id === data.userId ? { ...p, videoEnabled: data.enabled } : p
          ))
        }
      })

      socketInstance.on("user-audio-toggle", (data: any) => {
        if (data && data.userId) {
          setLocalParticipants(prev => prev.map(p => 
            p.id === data.userId ? { ...p, audioEnabled: data.enabled } : p
          ))
        }
      })

      socketInstance.on("user-screen-share-start", (data: any) => {
        if (data && data.userId) {
          setLocalParticipants(prev => prev.map(p => 
            p.id === data.userId ? { ...p, isScreenSharing: true } : p
          ))
        }
      })

      socketInstance.on("user-screen-share-stop", (data: any) => {
        if (data && data.userId) {
          setLocalParticipants(prev => prev.map(p => 
            p.id === data.userId ? { ...p, isScreenSharing: false } : p
          ))
        }
      })

      socketInstance.on("hand-raised", (data: any) => {
        if (data && data.userId) {
          setLocalParticipants(prev => prev.map(p => 
            p.id === data.userId ? { ...p, isHandRaised: data.raised } : p
          ))
        }
      })
    } catch (error) {
      console.error("Failed to initialize participants socket:", error)
    }
  }

  const toggleHandRaise = (participantId: string) => {
    if (!socket || !roomId) return

    const participant = localParticipants.find(p => p.id === participantId)
    const newState = !participant?.isHandRaised

    setLocalParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, isHandRaised: newState } : p
    ))

    socket.emit("hand-raise", { roomId, userId: participantId, raised: newState })
  }

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U'
    return name.split(" ").map(n => n && n[0] ? n[0] : '').join("").toUpperCase().slice(0, 2) || 'U'
  }

  const formatJoinTime = (joinedAt?: string) => {
    if (!joinedAt) return ""
    const time = new Date(joinedAt)
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const sortedParticipants = [...localParticipants].sort((a, b) => {
    // Host first
    if (a.isHost && !b.isHost) return -1
    if (!a.isHost && b.isHost) return 1
    
    // Hand raised next
    if (a.isHandRaised && !b.isHandRaised) return -1
    if (!a.isHandRaised && b.isHandRaised) return 1
    
    // Then by name
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-3">
      <ScrollArea className="max-h-96">
        <div className="space-y-2">
          {sortedParticipants.map((participant) => (
            <Card key={participant.id} className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Status indicators */}
                    <div className="absolute -bottom-1 -right-1 flex space-x-1">
                      {participant.isHost && (
                        <div className="bg-yellow-500 rounded-full p-1">
                          <Crown className="w-2 h-2 text-white" />
                        </div>
                      )}
                      {participant.isHandRaised && (
                        <div className="bg-orange-500 rounded-full p-1 animate-pulse">
                          <Hand className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Participant Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium truncate">
                        {participant.name}
                        {participant.id === currentUserId && " (You)"}
                      </span>
                      {participant.isHost && (
                        <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                          Host
                        </Badge>
                      )}
                    </div>
                    
                    {participant.joinedAt && (
                      <div className="text-xs text-gray-400">
                        Joined {formatJoinTime(participant.joinedAt)}
                      </div>
                    )}

                    {/* Media Status */}
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`p-1 rounded ${participant.audioEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                        {participant.audioEnabled ? (
                          <Mic className="w-3 h-3 text-white" />
                        ) : (
                          <MicOff className="w-3 h-3 text-white" />
                        )}
                      </div>
                      
                      <div className={`p-1 rounded ${participant.videoEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                        {participant.videoEnabled ? (
                          <Video className="w-3 h-3 text-white" />
                        ) : (
                          <VideoOff className="w-3 h-3 text-white" />
                        )}
                      </div>

                      {participant.isScreenSharing && (
                        <div className="p-1 rounded bg-blue-600">
                          <Monitor className="w-3 h-3 text-white" />
                        </div>
                      )}

                      {participant.isSpeaking && (
                        <div className="p-1 rounded bg-green-500 animate-pulse">
                          <Volume2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    {participant.id === currentUserId && (
                      <Button
                        size="sm"
                        variant={participant.isHandRaised ? "default" : "outline"}
                        onClick={() => toggleHandRaise(participant.id)}
                        className="w-8 h-8 p-0"
                      >
                        <Hand className="w-3 h-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-8 h-8 p-0 text-gray-400 hover:text-white"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Invite Button */}
      {roomId && (
        <Button
          variant="outline"
          className="w-full bg-transparent border-gray-600 text-gray-300 hover:bg-gray-600"
          onClick={() => {
            // This would open an invite modal
            console.log("Open invite modal")
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Others
        </Button>
      )}

      {/* Participants Summary */}
      <div className="text-xs text-gray-400 text-center">
        {localParticipants.length} participant{localParticipants.length !== 1 ? 's' : ''} online
      </div>
    </div>
  )
}