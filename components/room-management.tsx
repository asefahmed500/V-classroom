"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Users, 
  Copy, 
  ExternalLink,
  Trash2,
  Edit,
  Eye
} from "lucide-react"

interface Room {
  _id: string
  name: string
  subject: string
  roomCode: string
  participants: any[]
  maxParticipants: number
  isActive: boolean
  createdAt: string
  privacy: string
}

interface RoomManagementProps {
  userId: string
}

export function RoomManagement({ userId }: RoomManagementProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserRooms()
  }, [userId])

  const fetchUserRooms = async () => {
    try {
      const response = await fetch(`/api/rooms/user/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyRoomCode = (roomCode: string) => {
    navigator.clipboard.writeText(roomCode)
  }

  const copyRoomLink = (roomCode: string) => {
    const roomLink = `${window.location.origin}/join?code=${roomCode}`
    navigator.clipboard.writeText(roomLink)
  }

  if (loading) {
    return <div className="text-center py-8">Loading your rooms...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Study Rooms</h2>
      
      {rooms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">You haven't created any rooms yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rooms.map((room) => (
            <Card key={room._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">📚 {room.subject}</Badge>
                      <Badge variant={room.privacy === 'private' ? 'destructive' : 'secondary'}>
                        {room.privacy}
                      </Badge>
                      <Badge variant={room.isActive ? 'default' : 'secondary'}>
                        {room.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold">
                      {room.roomCode}
                    </div>
                    <div className="text-sm text-gray-500">
                      {room.participants.length}/{room.maxParticipants} participants
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Created: {new Date(room.createdAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => copyRoomCode(room.roomCode)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => copyRoomLink(room.roomCode)}
                      size="sm"
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(`/rooms/${room._id}`, '_blank')}
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Enter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}