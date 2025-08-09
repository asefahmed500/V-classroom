"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoomCodeDisplay } from "@/components/room-code-display"
import { ConnectionStatusDisplay } from "@/components/connection-status-display"
import { RoomManagementCard } from "@/components/room-management-card"
import { 
  Plus, 
  Users, 
  Search, 
  Filter,
  BookOpen,
  Clock,
  Eye,
  Settings,
  Trash2,
  RefreshCw,
  Crown,
  Calendar
} from "lucide-react"
import Link from "next/link"

interface Room {
  _id: string
  name: string
  subject: string
  roomCode: string
  description?: string
  participants: any[]
  maxParticipants: number
  isActive: boolean
  createdAt: string
  privacy: string
  createdBy: string
  creatorName?: string
  creatorEmail?: string
  settings: any
}

export default function RoomsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("my-rooms")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchRooms()
    }
  }, [session?.user?.id])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      
      // Fetch user's rooms
      const myRoomsResponse = await fetch('/api/rooms/list?type=created')
      if (myRoomsResponse.ok) {
        const myRoomsData = await myRoomsResponse.json()
        setMyRooms(myRoomsData.rooms || [])
      }

      // Fetch public rooms
      const publicRoomsResponse = await fetch('/api/rooms/list?type=public&limit=20')
      if (publicRoomsResponse.ok) {
        const publicRoomsData = await publicRoomsResponse.json()
        setPublicRooms(publicRoomsData.rooms || [])
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        setMyRooms(prev => prev.filter(room => room._id !== roomId))
        alert(`Room "${result.deletedRoom?.name || 'Unknown'}" deleted successfully`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete room')
        throw new Error(error.error || 'Failed to delete room')
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      throw error
    }
  }

  const updateRoom = async (roomId: string, updates: any) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const result = await response.json()
        setMyRooms(prev => prev.map(room => 
          room._id === roomId ? { ...room, ...result.room } : room
        ))
        alert('Room updated successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update room')
        throw new Error(error.error || 'Failed to update room')
      }
    } catch (error) {
      console.error('Failed to update room:', error)
      throw error
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your rooms...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Study Rooms</h1>
                <p className="text-sm text-gray-600">Manage and join collaborative study sessions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button onClick={fetchRooms} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/rooms/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-96">
            <TabsTrigger value="my-rooms">My Rooms ({myRooms.length})</TabsTrigger>
            <TabsTrigger value="public-rooms">Public Rooms ({publicRooms.length})</TabsTrigger>
          </TabsList>

          {/* My Rooms Tab */}
          <TabsContent value="my-rooms" className="space-y-6">
            {myRooms.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No rooms yet</h3>
                  <p className="text-gray-600 mb-6">Create your first study room to get started</p>
                  <Link href="/rooms/create">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Room
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {myRooms.map((room) => (
                  <Card key={room._id} className="overflow-hidden">
                    <div className="grid lg:grid-cols-3 gap-6 p-6">
                      {/* Room Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{room.name}</h3>
                            <div className="flex items-center space-x-3 mb-2">
                              <Badge variant="outline">📚 {room.subject}</Badge>
                              <Badge variant={room.privacy === 'private' ? 'destructive' : 'secondary'}>
                                {room.privacy}
                              </Badge>
                              <Badge variant={room.isActive ? 'default' : 'secondary'}>
                                {room.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {room.description && (
                              <p className="text-gray-600 text-sm">{room.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Link href={`/rooms/${room._id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteRoom(room._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Room Stats */}
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{room.participants.length}/{room.maxParticipants} participants</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                          </div>
                          {room.creatorName && (
                            <div className="flex items-center space-x-1">
                              <Crown className="w-4 h-4 text-yellow-500" />
                              <span>by {room.creatorName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Room Code Display */}
                      <div>
                        <RoomCodeDisplay
                          roomCode={room.roomCode}
                          roomName={room.name}
                          roomId={room._id}
                          participantCount={room.participants.length}
                          maxParticipants={room.maxParticipants}
                          isHost={true}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Public Rooms Tab */}
          <TabsContent value="public-rooms" className="space-y-6">
            {publicRooms.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No public rooms available</h3>
                  <p className="text-gray-600 mb-6">Check back later or create your own room</p>
                  <Link href="/rooms/create">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Room
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicRooms.map((room) => (
                  <Card key={room._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{room.name}</CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">📚 {room.subject}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              {room.participants.length}/{room.maxParticipants}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-mono font-bold text-blue-900">
                            {room.roomCode}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {room.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {room.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(room.createdAt).toLocaleDateString()}
                          </div>
                          {room.creatorName && (
                            <div>
                              <Crown className="w-3 h-3 inline mr-1 text-yellow-500" />
                              {room.creatorName}
                            </div>
                          )}
                        </div>
                        
                        <Link href={`/join?code=${room.roomCode}`}>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Users className="w-3 h-3 mr-1" />
                            Join
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}