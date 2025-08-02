"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Share2, 
  Copy, 
  Mail, 
  MessageSquare, 
  QrCode, 
  Users, 
  Check,
  ExternalLink
} from "lucide-react"

interface RoomInviteProps {
  roomId: string
  roomName: string
  roomCode: string
  participants: Array<{
    id: string
    name: string
    isHost: boolean
  }>
}

export function RoomInvite({ roomId, roomName, roomCode, participants }: RoomInviteProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const roomUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/rooms/${roomId}`
  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/join/${roomCode}`

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join my study room: ${roomName}`)
    const body = encodeURIComponent(
      `Hi! I'd like to invite you to join my study room.\n\n` +
      `Room: ${roomName}\n` +
      `Room Code: ${roomCode}\n` +
      `Direct Link: ${roomUrl}\n\n` +
      `You can join by entering the room code or clicking the link above.\n\n` +
      `See you there!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Join my study room: ${roomName}\n` +
      `Room Code: ${roomCode}\n` +
      `Link: ${roomUrl}`
    )
    window.open(`https://wa.me/?text=${message}`)
  }

  const generateQRCode = () => {
    // This would integrate with a QR code library
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(roomUrl)}`
    window.open(qrUrl, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Invite to Study Room
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{roomName}</h3>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div>Room Code: <Badge variant="secondary">{roomCode}</Badge></div>
              <div>{participants.length} participants</div>
            </div>
          </div>

          {/* Room Code */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Room Code
            </label>
            <div className="flex space-x-2">
              <Input 
                value={roomCode} 
                readOnly 
                className="font-mono text-center text-lg font-bold"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(roomCode, 'code')}
                className="px-3"
              >
                {copied === 'code' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Others can join by entering this code
            </p>
          </div>

          {/* Direct Link */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Direct Link
            </label>
            <div className="flex space-x-2">
              <Input 
                value={roomUrl} 
                readOnly 
                className="text-sm"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(roomUrl, 'link')}
                className="px-3"
              >
                {copied === 'link' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Direct link to join the room
            </p>
          </div>

          {/* Share Options */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Share via
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={shareViaEmail}
                className="flex items-center justify-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={shareViaWhatsApp}
                className="flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={generateQRCode}
                className="flex items-center justify-center space-x-2"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `Join my study room: ${roomName}`,
                      text: `Room Code: ${roomCode}`,
                      url: roomUrl,
                    })
                  } else {
                    copyToClipboard(
                      `Join my study room: ${roomName}\nRoom Code: ${roomCode}\nLink: ${roomUrl}`,
                      'share'
                    )
                  }
                }}
                className="flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>

          {/* Current Participants */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Current Participants ({participants.length})
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-2 text-sm">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="flex-1">{participant.name}</span>
                  {participant.isHost && (
                    <Badge variant="secondary" className="text-xs">Host</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">How to join:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter the room code on the join page</li>
              <li>• Click the direct link</li>
              <li>• Scan the QR code with your phone</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}