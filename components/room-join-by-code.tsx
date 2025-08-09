"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Users, Video, Loader2 } from "lucide-react"

interface RoomJoinByCodeProps {
  onRoomFound?: (roomData: any) => void
  initialCode?: string
}

export function RoomJoinByCode({ onRoomFound, initialCode = "" }: RoomJoinByCodeProps) {
  const [roomCode, setRoomCode] = useState(initialCode)
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomData, setRoomData] = useState<any>(null)
  const router = useRouter()

  // Auto-search if initial code is provided
  useEffect(() => {
    if (initialCode && initialCode.trim().length > 0) {
      handleFindRoom()
    }
  }, [initialCode])

  const handleFindRoom = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First try the new lookup endpoint
      const lookupResponse = await fetch('/api/rooms/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: roomCode.trim() })
      })

      if (lookupResponse.ok) {
        const data = await lookupResponse.json()
        setRoomData(data.room)
        onRoomFound?.(data.room)
      } else {
        // Fallback to original endpoint
        const response = await fetch(`/api/rooms/join/${roomCode.trim()}`)
        
        if (response.ok) {
          const data = await response.json()
          setRoomData(data)
          onRoomFound?.(data)
        } else {
          const errorData = await response.json()
          setError(errorData.message || errorData.error || "Room not found")
          setRoomData(null)
        }
      }
    } catch (error) {
      console.error("Error finding room:", error)
      setError("Failed to find room. Please try again.")
      setRoomData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      setError("Please enter your name")
      return
    }

    if (!roomData) {
      setError("Please find a room first")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if user is authenticated
      const authResponse = await fetch("/api/auth/me")
      const isAuthenticated = authResponse.ok
      
      // Check if room is private and user is not authenticated
      if (roomData.isPrivate && !isAuthenticated) {
        // Redirect to signup/login with room info
        const signupUrl = `/auth/signup?redirect=${encodeURIComponent(`/rooms/${roomData.roomId}`)}&name=${encodeURIComponent(username)}&roomCode=${encodeURIComponent(roomCode)}`
        router.push(signupUrl)
        return
      }

      // Join the room (works for both authenticated and non-authenticated users for public rooms)
      const joinResponse = await fetch(`/api/rooms/${roomData.roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: username.trim() })
      })

      if (joinResponse.ok) {
        // Store username for the session
        localStorage.setItem('userName', username.trim())
        router.push(`/rooms/${roomData.roomId}`)
      } else {
        const errorData = await joinResponse.json()
        
        if (errorData.requiresAuth) {
          // Redirect to login for private rooms
          const loginUrl = `/auth/login?redirect=${encodeURIComponent(`/rooms/${roomData.roomId}`)}&name=${encodeURIComponent(username)}&roomCode=${encodeURIComponent(roomCode)}`
          router.push(loginUrl)
        } else {
          setError(errorData.message || "Failed to join room")
        }
      }
    } catch (error) {
      console.error("Error joining room:", error)
      setError("Failed to join room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Room Code Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Join Study Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="roomCode">Room Code</Label>
            <div className="flex space-x-2">
              <Input
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim())}
                placeholder="Enter room code"
                className="font-mono text-center tracking-wider"
              />
              <Button onClick={handleFindRoom} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Room"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Found */}
      {roomData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Room Found!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{roomData.roomName}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <Badge variant="outline">📚 {roomData.subject}</Badge>
                <span>{roomData.participants}/{roomData.maxParticipants} participants</span>
              </div>
            </div>

            <div>
              <Label htmlFor="username">Your Name</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                maxLength={50}
              />
            </div>

            <Button 
              onClick={handleJoinRoom} 
              disabled={loading || !username.trim()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Join Study Room
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}