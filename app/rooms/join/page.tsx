"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Video, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  
  // Get room code from URL if provided
  useEffect(() => {
    const codeFromUrl = searchParams.get("code")
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase())
    }
  }, [searchParams])

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // First, verify the room exists
      const response = await fetch('/api/rooms/join-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
          userName: session?.user?.name || 'Guest User',
          userEmail: session?.user?.email
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuccess(`Found room: ${data.roomName}. Joining...`)
        
        // Small delay to show success message
        setTimeout(() => {
          router.push(`/rooms/${data.roomId}`)
        }, 1000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Room not found. Please check the room code and try again.")
      }
    } catch (error) {
      console.error('Join room error:', error)
      setError("Failed to join room. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Join Study Room</h1>
              <p className="text-gray-600 mt-1">Enter a room code to join an existing study session</p>
            </div>
            <Link href="/rooms">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Rooms
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Join Study Room</CardTitle>
              <CardDescription className="text-gray-600">
                Enter the room code shared by your study partner
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomCode" className="text-sm font-medium text-gray-700">
                    Room Code
                  </Label>
                  <Input
                    id="roomCode"
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code (e.g., MATH101)"
                    className="h-12 text-center text-lg font-mono tracking-wider border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={loading}
                    maxLength={10}
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Room codes are usually 6 characters long
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !roomCode.trim()}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Joining Room...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span>Join Room</span>
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Don't have a room code?</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link href="/rooms">
                    <Button variant="outline" className="w-full">
                      Browse Rooms
                    </Button>
                  </Link>
                  <Link href="/rooms/create">
                    <Button variant="outline" className="w-full">
                      Create Room
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="text-center">
                <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  ← Back to Dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}