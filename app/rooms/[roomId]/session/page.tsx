"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { io, Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, Users, Eye, EyeOff, Minimize, Maximize, Settings,
  Mic, MicOff, Video, VideoOff, Monitor, Hand, PhoneOff,
  MessageSquare, FileText, Palette
} from "lucide-react"

interface RoomData {
  id: string
  name: string
  roomCode: string
  createdBy: string
}

export default function RoomSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  
  const roomId = params.roomId as string
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user || !roomId) return
    
    loadRoomData()
  }, [session, roomId])

  const loadRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/find-by-id/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setRoomData({
          id: roomId,
          name: data.room.name,
          roomCode: data.room.roomCode,
          createdBy: data.room.createdBy
        })
      } else {
        toast.error("Room not found")
        router.push("/rooms")
      }
    } catch (error) {
      console.error("Failed to load room:", error)
      toast.error("Failed to load room")
      router.push("/rooms")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveRoom = () => {
    router.push(`/rooms/${roomId}`)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Please sign in to join the room...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading room session...</p>
        </div>
      </div>
    )
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Room not found</p>
        </div>
      </div>
    )
  }

  return (
    <GoogleMeetRoomInterface
      roomId={roomId}
      roomName={roomData.name}
      roomCode={roomData.roomCode}
      userId={session.user.id!}
      userName={session.user.name!}
      userEmail={session.user.email!}
      isHost={session.user.id === roomData.createdBy}
      onLeave={handleLeaveRoom}
    />
  )
}