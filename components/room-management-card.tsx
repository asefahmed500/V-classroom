"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RoomCodeDisplay } from "./room-code-display"
import { 
  Eye, 
  Trash2, 
  Edit, 
  Users, 
  Clock, 
  Settings,
  MoreVertical,
  Copy,
  ExternalLink,
  AlertTriangle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  settings: any
}

interface RoomManagementCardProps {
  room: Room
  currentUserId: string
  onDelete: (roomId: string) => Promise<void>
  onUpdate?: (roomId: string, updates: any) => Promise<void>
}

export function RoomManagementCard({ 
  room, 
  currentUserId, 
  onDelete, 
  onUpdate 
}: RoomManagementCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const isOwner = room.createdBy === currentUserId

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      await onDelete(room._id)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleting(false)
    }
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode)
      setCopied('code')
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyRoomLink = async () => {
    try {
      const link = `${window.location.origin}/join?code=${room.roomCode}`
      await navigator.clipboard.writeText(link)
      setCopied('link')
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const toggleRoomStatus = async () => {
    if (onUpdate) {
      try {
        await onUpdate(room._id, { isActive: !room.isActive })
      } catch (error) {
        console.error('Update failed:', error)
      }
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="grid lg:grid-cols-3 gap-6 p-6">
        {/* Room Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                {!room.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-3 mb-3">
                <Badge variant="outline">📚 {room.subject}</Badge>
                <Badge variant={room.privacy === 'private' ? 'destructive' : 'secondary'}>
                  {room.privacy}
                </Badge>
                <Badge variant={room.isActive ? 'default' : 'secondary'}>
                  {room.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {room.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {room.description}
                </p>
              )}

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
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/rooms/${room._id}`} className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    View Room
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={copyRoomCode}>
                  <Copy className="w-4 h-4 mr-2" />
                  {copied === 'code' ? 'Copied!' : 'Copy Code'}
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={copyRoomLink}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {copied === 'link' ? 'Copied!' : 'Copy Link'}
                </DropdownMenuItem>

                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleRoomStatus}>
                      <Settings className="w-4 h-4 mr-2" />
                      {room.isActive ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleting ? 'Deleting...' : 'Delete Room'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <Link href={`/rooms/${room._id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-2" />
                Enter Room
              </Button>
            </Link>
            
            <Button size="sm" variant="outline" onClick={copyRoomCode}>
              {copied === 'code' ? 'Copied!' : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>

            <Link href={`/join?code=${room.roomCode}`}>
              <Button size="sm" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Test Join
              </Button>
            </Link>
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
            isHost={isOwner}
          />
        </div>
      </div>
    </Card>
  )
}