"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Copy, 
  ExternalLink, 
  QrCode, 
  Share2, 
  Check,
  Users,
  Clock,
  Eye,
  EyeOff
} from "lucide-react"

interface RoomCodeDisplayProps {
  roomCode: string
  roomName: string
  roomId: string
  participantCount?: number
  maxParticipants?: number
  isHost?: boolean
  className?: string
}

export function RoomCodeDisplay({ 
  roomCode, 
  roomName, 
  roomId,
  participantCount = 0,
  maxParticipants = 8,
  isHost = false,
  className = ""
}: RoomCodeDisplayProps) {
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

  const copyRoomCode = () => copyToClipboard(roomCode, 'code')
  
  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/join?code=${roomCode}`
    copyToClipboard(roomLink, 'link')
  }

  const copyInviteMessage = () => {
    const message = `Join my study room "${roomName}"!\n\nRoom Code: ${roomCode}\nOr click: ${window.location.origin}/join?code=${roomCode}`
    copyToClipboard(message, 'invite')
  }

  const shareRoom = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${roomName}" Study Room`,
          text: `Join my study room using code: ${roomCode}`,
          url: `${window.location.origin}/join?code=${roomCode}`
        })
      } catch (error) {
        console.error('Share failed:', error)
        copyInviteMessage()
      }
    } else {
      copyInviteMessage()
    }
  }

  return (
    <Card className={`border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-blue-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Room Access Code
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-white">
              {participantCount}/{maxParticipants} joined
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
          <div className="bg-white rounded-lg p-6 border-2 border-dashed border-blue-300">
            {showCode ? (
              <>
                <div className="text-sm text-gray-600 mb-2">Share this code to invite others:</div>
                <div className="text-4xl font-mono font-bold text-blue-900 tracking-wider mb-3 select-all">
                  {roomCode}
                </div>
                <div className="text-xs text-gray-500">
                  Case-insensitive • 6 characters
                </div>
              </>
            ) : (
              <div className="py-4">
                <div className="text-gray-500 mb-2">Room code hidden</div>
                <div className="text-2xl text-gray-400">••••••</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={copyRoomCode}
            variant="outline"
            className="bg-white hover:bg-blue-50 border-blue-200"
            disabled={!showCode}
          >
            {copied === 'code' ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>

          <Button
            onClick={copyRoomLink}
            variant="outline"
            className="bg-white hover:bg-blue-50 border-blue-200"
          >
            {copied === 'link' ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        <Button
          onClick={shareRoom}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {copied === 'invite' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Invite Message Copied!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Share Room
            </>
          )}
        </Button>

        {/* Quick Instructions */}
        <div className="bg-white/50 rounded-lg p-3 text-sm text-gray-700">
          <div className="font-medium mb-1">How to join:</div>
          <div className="space-y-1 text-xs">
            <div>• Go to <span className="font-mono bg-gray-100 px-1 rounded">studyrooms.com/join</span></div>
            <div>• Enter code: <span className="font-mono bg-gray-100 px-1 rounded">{showCode ? roomCode : '••••••'}</span></div>
            <div>• Or click the shared link directly</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}