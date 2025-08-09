"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Crown,
  Calendar,
  Users,
  Globe,
  Lock,
  Clock,
  Settings,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Eye,
  EyeOff
} from "lucide-react"

interface RoomInfoPanelProps {
  roomData: {
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
    createdBy: string
    creatorName?: string
    creatorEmail?: string
    settings?: any
  }
  currentUserId: string
  isHost: boolean
  participants?: any[]
}

export function RoomInfoPanel({ 
  roomData, 
  currentUserId, 
  isHost, 
  participants = [] 
}: RoomInfoPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(true)

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyRoomCode = () => copyToClipboard(roomData.roomCode, 'code')
  
  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/join?code=${roomData.roomCode}`
    copyToClipboard(roomLink, 'link')
  }

  const shareRoom = async () => {
    const message = `Join my study room "${roomData.name}"!\n\nRoom Code: ${roomData.roomCode}\nSubject: ${roomData.subject}\nOr click: ${window.location.origin}/join?code=${roomData.roomCode}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${roomData.name}" Study Room`,
          text: message,
          url: `${window.location.origin}/join?code=${roomData.roomCode}`
        })
      } catch (error) {
        console.error('Share failed:', error)
        copyToClipboard(message, 'invite')
      }
    } else {
      copyToClipboard(message, 'invite')
    }
  }

  return (
    <div className="space-y-4">
      {/* Room Code Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-blue-900 flex items-center">
              <Share2 className="w-5 h-5 mr-2" />
              Room Access
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-white">
                {roomData.participantCount}/{roomData.maxParticipants}
              </Badge>
              {isHost && (
                <Button
                  onClick={() => setShowCode(!showCode)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Room Code Display */}
          <div className="text-center">
            <div className="bg-white rounded-lg p-4 border-2 border-dashed border-blue-300">
              {showCode ? (
                <>
                  <div className="text-sm text-gray-600 mb-2">Share this code:</div>
                  <div className="text-3xl font-mono font-bold text-blue-900 tracking-wider mb-2 select-all">
                    {roomData.roomCode}
                  </div>
                  <div className="text-xs text-gray-500">Case-insensitive</div>
                </>
              ) : (
                <div className="py-2">
                  <div className="text-gray-500 mb-1">Code hidden</div>
                  <div className="text-xl text-gray-400">••••••</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={copyRoomCode}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-blue-50 border-blue-200"
              disabled={!showCode}
            >
              {copied === 'code' ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Code
                </>
              )}
            </Button>

            <Button
              onClick={copyRoomLink}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-blue-50 border-blue-200"
            >
              {copied === 'link' ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={shareRoom}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {copied === 'invite' ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Invite Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share Room
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Room Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Room Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subject:</span>
            <Badge variant="outline">{roomData.subject}</Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Privacy:</span>
            <div className="flex items-center space-x-1">
              {roomData.privacy === 'private' ? (
                <>
                  <Lock className="w-4 h-4 text-red-500" />
                  <Badge variant="destructive">Private</Badge>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 text-green-500" />
                  <Badge variant="secondary">Public</Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status:</span>
            <Badge variant={roomData.isActive ? 'default' : 'secondary'}>
              {roomData.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Created:</span>
            <div className="flex items-center space-x-1 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{new Date(roomData.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Capacity:</span>
            <div className="flex items-center space-x-1 text-sm">
              <Users className="w-4 h-4" />
              <span>{roomData.participantCount}/{roomData.maxParticipants}</span>
            </div>
          </div>
          
          {roomData.creatorName && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Host:</span>
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-yellow-100 text-yellow-800">
                    {roomData.creatorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm flex items-center">
                  <Crown className="w-3 h-3 mr-1 text-yellow-500" />
                  {roomData.creatorName}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Participants */}
      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={participant.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {participant.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{participant.name || 'Unknown'}</span>
                    {participant.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                    {participant.id === currentUserId && (
                      <span className="text-xs text-gray-500">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      participant.connectionStatus === 'connected' ? 'bg-green-500' :
                      participant.connectionStatus === 'connecting' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2 flex items-center">
              <QrCode className="w-4 h-4 mr-2" />
              How others can join:
            </div>
            <div className="space-y-1 text-xs">
              <div>• Visit: <span className="font-mono bg-white px-1 rounded">studyrooms.com/join</span></div>
              <div>• Enter code: <span className="font-mono bg-white px-1 rounded">{showCode ? roomData.roomCode : '••••••'}</span></div>
              <div>• Or use the shared link directly</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}