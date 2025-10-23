"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Video, Users, Clock, User, 
  ArrowRight, Copy, Link2, AlertCircle
} from "lucide-react"
import { toast } from "sonner"

export default function JoinVideoCallPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  
  const [roomCode, setRoomCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [roomInfo, setRoomInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Get room code from URL if provided
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase())
      // Auto-lookup room info if code is provided
      lookupRoom(codeFromUrl.toUpperCase())
    }
  }, [searchParams])

  const lookupRoom = async (code: string) => {
    if (!code || code.length < 6) return

    try {
      const response = await fetch(`/api/video-calls/lookup?code=${code}`)
      
      if (response.ok) {
        const data = await response.json()
        setRoomInfo(data.videoCall)
        setError(null)
      } else if (response.status === 404) {
        setRoomInfo(null)
        setError("Room not found with this code")
      } else {
        setRoomInfo(null)
        setError("Failed to lookup room")
      }
    } catch (error) {
      console.error("Error looking up room:", error)
      setRoomInfo(null)
      setError("Failed to lookup room")
    }
  }

  const handleCodeChange = (value: string) => {
    const upperCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setRoomCode(upperCode)
    
    // Auto-lookup when code is complete
    if (upperCode.length >= 6) {
      lookupRoom(upperCode)
    } else {
      setRoomInfo(null)
      setError(null)
    }
  }

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      toast.error("Please enter a room code")
      return
    }

    if (!session?.user) {
      toast.error("Please sign in to join the video call")
      return
    }

    if (!roomInfo) {
      toast.error("Room not found")
      return
    }

    setIsJoining(true)

    try {
      // Join the video call
      const response = await fetch(`/api/video-calls/${roomInfo.roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'join',
          data: {
            socketId: '', // Will be set by socket connection
            videoEnabled: true,
            audioEnabled: true
          }
        })
      })

      if (response.ok) {
        toast.success("Joining video call...")
        router.push(`/video-call/${roomInfo.roomId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to join video call")
      }
    } catch (error) {
      console.error("Error joining video call:", error)
      toast.error("Failed to join video call")
    } finally {
      setIsJoining(false)
    }
  }

  const copyCurrentUrl = () => {
    const currentUrl = window.location.href
    navigator.clipboard.writeText(currentUrl)
    toast.success("Link copied to clipboard")
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return "Just started"
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    const remainingMins = diffMins % 60
    
    if (diffHours < 24) {
      return remainingMins > 0 
        ? `${diffHours}h ${remainingMins}m ago`
        : `${diffHours} hours ago`
    }
    
    return start.toLocaleDateString()
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <Video className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <CardTitle className="text-white">Sign In Required</CardTitle>
            <CardDescription className="text-gray-400">
              Please sign in to join the video call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Video className="w-12 h-12 text-blue-500 mr-3" />
            <h1 className="text-3xl font-bold text-white">Join Video Call</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Enter the room code to join an existing video call
          </p>
        </div>

        {/* Join Form */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Enter Room Code</CardTitle>
            <CardDescription className="text-gray-400">
              The room code is usually 6-8 characters long
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roomCode" className="text-white">
                Room Code
              </Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Enter room code..."
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-center text-2xl font-mono tracking-wider"
                maxLength={8}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Room Info */}
            {roomInfo && (
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">
                    {roomInfo.roomName}
                  </h3>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Active
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <User className="w-4 h-4" />
                    <span>Host: {roomInfo.hostName}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Users className="w-4 h-4" />
                    <span>{roomInfo.participants?.length || 0} participants</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>Started {formatDuration(roomInfo.startedAt)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Video className="w-4 h-4" />
                    <span>Room: {roomInfo.roomCode}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {roomInfo.settings?.allowChat && (
                    <Badge variant="secondary" className="text-xs">
                      Chat Enabled
                    </Badge>
                  )}
                  {roomInfo.settings?.allowScreenShare && (
                    <Badge variant="secondary" className="text-xs">
                      Screen Share
                    </Badge>
                  )}
                  {roomInfo.settings?.allowFileShare && (
                    <Badge variant="secondary" className="text-xs">
                      File Sharing
                    </Badge>
                  )}
                  {roomInfo.settings?.requireApproval && (
                    <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
                      Approval Required
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Join Button */}
            <Button 
              onClick={handleJoin}
              disabled={isJoining || !roomInfo || !roomCode.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            >
              {isJoining ? (
                "Joining..."
              ) : (
                <>
                  Join Video Call
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Share Link */}
            {roomCode && (
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Share this join link:</span>
                  <Button
                    onClick={copyCurrentUrl}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="mt-2 p-2 bg-gray-700 rounded text-gray-300 text-sm font-mono break-all">
                  {window.location.href}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-gray-300">
              <div>
                <strong className="text-white">Don't have a room code?</strong>
                <p className="text-sm">Ask the meeting host to share the room code or invite link with you.</p>
              </div>
              
              <div>
                <strong className="text-white">Want to start your own meeting?</strong>
                <p className="text-sm">
                  <Button
                    onClick={() => router.push('/video-call/create')}
                    variant="link"
                    className="p-0 h-auto text-blue-400 hover:text-blue-300"
                  >
                    Create a new video call
                  </Button>
                  {" "}and invite others to join.
                </p>
              </div>
              
              <div>
                <strong className="text-white">Having trouble joining?</strong>
                <p className="text-sm">Make sure you have a stable internet connection and camera/microphone permissions enabled.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}