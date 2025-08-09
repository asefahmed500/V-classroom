"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Users, 
  Video, 
  MessageSquare, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import Link from "next/link"

interface RoomData {
  _id: string
  name: string
  subject: string
  description?: string
  roomType: string
  maxParticipants: number
  participants: Array<{
    user: {
      name: string
      email: string
    }
    isHost: boolean
  }>
  isActive: boolean
}

interface PageProps {
  params: Promise<{ roomId: string }>
}

function RoomJoinPageContent({ params }: PageProps) {
  const [roomId, setRoomId] = useState<string>("")
  const [room, setRoom] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState({ name: "", email: "" })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInvite = searchParams.get("invite") === "true"
  const invitedEmail = searchParams.get("email")

  useEffect(() => {
    const initializeRoom = async () => {
      const resolvedParams = await params
      setRoomId(resolvedParams.roomId)
      checkAuthAndFetchRoom(resolvedParams.roomId)
    }
    initializeRoom()
  }, [])

  const checkAuthAndFetchRoom = async (id: string) => {
    try {
      // Check if user is authenticated
      const authResponse = await fetch("/api/auth/me")
      if (authResponse.ok) {
        const user = await authResponse.json()
        setIsAuthenticated(true)
        setUserInfo({ name: user.name, email: user.email })
      } else {
        setIsAuthenticated(false)
        if (invitedEmail) {
          setUserInfo({ name: "", email: invitedEmail })
        }
      }

      // Fetch room data
      const roomResponse = await fetch(`/api/rooms/${id}`)
      if (roomResponse.ok) {
        const roomData = await roomResponse.json()
        setRoom(roomData.room || roomData)
      } else {
        setError("Room not found or no longer available")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to load room information")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!room) return

    setJoining(true)
    setError(null)

    try {
      if (!isAuthenticated) {
        // If not authenticated, redirect to signup with room info
        const signupUrl = `/auth/signup?redirect=${encodeURIComponent(`/rooms/${roomId}`)}&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name)}`
        router.push(signupUrl)
        return
      }

      // Join the room
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        // Redirect to the room
        router.push(`/rooms/${roomId}`)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to join room")
      }
    } catch (error) {
      console.error("Error joining room:", error)
      setError("Network error occurred")
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading room information...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Room Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          
          {isInvite && (
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              You're Invited!
            </Badge>
          )}
          
          <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            {room.name}
          </CardTitle>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              📚 {room.subject}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {room.roomType}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Room Description */}
          {room.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{room.description}</p>
            </div>
          )}

          {/* Room Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {room.participants.length}/{room.maxParticipants}
              </div>
              <div className="text-sm text-gray-600">Participants</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {room.isActive ? (
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                ) : (
                  <Clock className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {room.isActive ? "Live" : "Waiting"}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-3 text-gray-900">What's included:</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Video className="w-4 h-4 text-blue-500" />
                <span>HD Video Chat</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <span>Real-time Chat</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="w-4 h-4 text-purple-500" />
                <span>Collaborative Whiteboard</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-orange-500" />
                <span>File Sharing</span>
              </div>
            </div>
          </div>

          {/* Current Participants */}
          {room.participants.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gray-900">Current Participants:</h3>
              <div className="space-y-2">
                {room.participants.slice(0, 3).map((participant, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{participant.user.name}</span>
                    {participant.isHost && (
                      <Badge variant="secondary" className="text-xs">Host</Badge>
                    )}
                  </div>
                ))}
                {room.participants.length > 3 && (
                  <div className="text-sm text-gray-500">
                    +{room.participants.length - 3} more participants
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Info Form (for non-authenticated users) */}
          {!isAuthenticated && (
            <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-gray-900">Join as Guest</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    disabled={!!invitedEmail}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleJoinRoom}
              disabled={joining || (!isAuthenticated && (!userInfo.name.trim() || !userInfo.email.trim()))}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg font-semibold"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isAuthenticated ? "Joining Room..." : "Creating Account..."}
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  {isAuthenticated ? "Join Study Room" : "Sign Up & Join Room"}
                </>
              )}
            </Button>

            {!isAuthenticated && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Already have an account?</p>
                <Link href={`/auth/login?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`}>
                  <Button variant="outline" className="w-full">
                    Sign In Instead
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RoomJoinPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RoomJoinPageContent params={params} />
    </Suspense>
  )
}