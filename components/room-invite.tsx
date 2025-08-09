"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Share2, 
  Copy, 
  Mail, 
  MessageCircle, 
  QrCode,
  Users,
  Link as LinkIcon,
  Check
} from "lucide-react"

interface RoomInviteProps {
  roomId: string
  roomName: string
  roomCode: string
  participants: Array<{ id: string; name: string }>
}

export function RoomInvite({ roomId, roomName, roomCode, participants }: RoomInviteProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const roomUrl = `${window.location.origin}/rooms/${roomId}`
  const joinUrl = `${window.location.origin}/rooms/join?code=${roomCode}`

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join our study session: ${roomName}`)
    const body = encodeURIComponent(
      `Hi!\n\nYou're invited to join our study session "${roomName}".\n\n` +
      `Room Code: ${roomCode}\n` +
      `Direct Link: ${joinUrl}\n\n` +
      `See you there!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Join our study session "${roomName}"!\n\n` +
      `Room Code: ${roomCode}\n` +
      `Link: ${joinUrl}`
    )
    window.open(`https://wa.me/?text=${text}`)
  }

  const generateQRCode = () => {
    // In a real implementation, you'd use a QR code library
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`
    return qrUrl
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
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Invite to Study Room</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-1">{roomName}</h3>
              <div className="flex items-center justify-between text-sm text-blue-700">
                <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {roomCode}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Room Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={roomCode}
                readOnly
                className="font-mono text-lg text-center tracking-wider"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(roomCode, 'code')}
              >
                {copied === 'code' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Share this code for others to join quickly
            </p>
          </div>

          {/* Direct Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direct Join Link
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={joinUrl}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(joinUrl, 'link')}
              >
                {copied === 'link' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Direct link to join without entering a code
            </p>
          </div>

          {/* Share Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Share via
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              QR Code
            </label>
            <div className="inline-block p-4 bg-white border rounded-lg">
              <img
                src={generateQRCode()}
                alt="QR Code"
                className="w-32 h-32"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Scan to join the room
            </p>
          </div>

          {/* Instructions */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">How to join:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Enter room code: <code className="bg-gray-200 px-1 rounded">{roomCode}</code></li>
                <li>• Click the direct link above</li>
                <li>• Scan the QR code</li>
                <li>• Go to /rooms/join and enter the code</li>
              </ul>
            </CardContent>
          </Card>

          {/* Close Button */}
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}