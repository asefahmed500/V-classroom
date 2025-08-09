"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RoomWelcome } from "@/components/room-welcome"
import { RoomCodeDisplay } from "@/components/room-code-display"
import { ConnectionStatusDisplay } from "@/components/connection-status-display"
import { RoomInfoPanel } from "@/components/room-info-panel"
import { 
  Users, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  Crown
} from "lucide-react"
import Link from "next/link"

interface RoomData {
  id: string
  name: string
  subject: string
  roomCode: string
  description?: string
  maxParticipants: number
  participantCount: number
  privacy: string
  isActive: boolean
  createdAt: string
  settings: any
  createdBy: string
  creatorName?: string
  creatorEmail?: string
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<any[]>([])

  const roomId = params.roomId as string

  useEffect(() => {
    if (roomId) {
      fetchRoomData()
    }
  }, [roomId])

  const fetchRoomData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!roomId || roomId.trim() === '') {
        setError('Invalid room ID')
        return
      }

      // First try to find by room ID (if it looks like a MongoDB ObjectId)
      let response
      if (roomId.length === 24 && /^[0-9a-fA-F]{24}$/.test(roomId)) {
        response = await fetch(`/api/rooms/find-by-id/${roomId}`)
      } else {
        // If not a valid ObjectId, try as room code
        response = await fetch(`/api/rooms/join/${roomId}`)
      }
      
      // If first attempt failed, try the other method
      if (!response.ok) {
        if (roomId.length === 24 && /^[0-9a-fA-F]{24}$/.test(roomId)) {
          response = await fetch(`/api/rooms/join/${roomId}`)
        } else {
          response = await fetch(`/api/rooms/find-by-id/${roomId}`)
        }
      }

      if (response.ok) {
        const data = await response.json()
        
        // Normalize the data structure
        const normalizedData: RoomData = {
          id: data.room?.id || data.roomId || data.id,
          name: data.room?.name || data.roomName || data.name,
          subject: data.room?.subject || data.subject,
          roomCode: data.room?.roomCode || data.roomCode,
          description: data.room?.description || data.description,
          maxParticipants: data.room?.maxParticipants || data.maxParticipants || 10,
          participantCount: data.room?.participants || data.participants || 0,
          privacy: data.room?.privacy || data.privacy || 'public',
          isActive: data.room?.isActive ?? data.isActive ?? true,
          createdAt: data.room?.createdAt || data.createdAt,
          settings: data.room?.settings || data.settings || {},
          createdBy: data.room?.createdBy || data.createdBy || '',
          creatorName: data.room?.creatorName || data.creatorName,
          creatorEmail: data.room?.creatorEmail || data.creatorEmail
        }

        setRoomData(normalizedData)
        
        // Fetch participants/connections
        if (normalizedData.id) {
          fetchConnections(normalizedData.id)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || errorData.message || 'Room not found')
      }
    } catch (error) {
      console.error('Error fetching room:', error)
      setError('Failed to load room data')
    } finally {
      setLoading(false)
    }
  }

  const fetchConnections = async (roomId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/connections`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.connections || [])
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
    }
  }

  const handleEnterRoom = () => {
    // Navigate to the room session
    router.push(`/rooms/${roomId}/session`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={fetchRoomData} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link href="/rooms">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Rooms
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!roomData) {
    return null
  }

  const currentUser = {
    id: session?.user?.id || 'guest',
    name: session?.user?.name || 'Guest',
    isHost: session?.user?.id === roomData.createdBy
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/rooms">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{roomData.name}</h1>
                <p className="text-sm text-gray-600">Room Code: {roomData.roomCode}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant={roomData.isActive ? 'default' : 'secondary'}>
                {roomData.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button onClick={fetchRoomData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <RoomWelcome
              roomData={{
                name: roomData.name,
                subject: roomData.subject,
                roomCode: roomData.roomCode,
                description: roomData.description,
                maxParticipants: roomData.maxParticipants,
                participantCount: roomData.participantCount,
                settings: roomData.settings,
                createdBy: roomData.createdBy,
                creatorName: roomData.creatorName,
                creatorEmail: roomData.creatorEmail,
                createdAt: roomData.createdAt,
                privacy: roomData.privacy
              }}
              userName={currentUser.name}
              onEnterRoom={handleEnterRoom}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connection Status */}
            <ConnectionStatusDisplay
              roomId={roomData.id}
              currentUserId={currentUser.id}
            />

            {/* Comprehensive Room Info */}
            <RoomInfoPanel
              roomData={roomData}
              currentUserId={currentUser.id}
              isHost={currentUser.isHost}
              participants={participants}
            />
          </div>
        </div>
      </div>
    </div>
  )
}