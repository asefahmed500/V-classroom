"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Video, Plus, Users, Clock, 
  Calendar, Settings, History,
  ArrowRight, Copy, ExternalLink
} from "lucide-react"
import { toast } from "sonner"

interface RecentCall {
  roomId: string
  roomName: string
  roomCode: string
  hostName: string
  participantCount: number
  startedAt: string
  duration: number
  isHost: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadRecentCalls()
    }
  }, [session])

  const loadRecentCalls = async () => {
    try {
      const response = await fetch('/api/video-calls/recent')
      if (response.ok) {
        const data = await response.json()
        setRecentCalls(data.calls || [])
      }
    } catch (error) {
      console.error("Error loading recent calls:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickStart = async () => {
    try {
      const response = await fetch('/api/video-calls/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomName: `${session?.user?.name || 'User'}'s Quick Meeting`,
          maxParticipants: 25,
          settings: {
            allowScreenShare: true,
            allowFileShare: true,
            allowChat: true,
            requireApproval: false,
            recordingEnabled: false
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Meeting started!")
        router.push(`/video-call/${data.videoCall.roomId}`)
      } else {
        toast.error("Failed to start meeting")
      }
    } catch (error) {
      console.error("Error starting quick meeting:", error)
      toast.error("Failed to start meeting")
    }
  }

  const copyInviteLink = (roomCode: string) => {
    const inviteLink = `${window.location.origin}/video-call/join?code=${roomCode}`
    navigator.clipboard.writeText(inviteLink)
    toast.success("Invite link copied to clipboard")
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString()
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <Video className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <CardTitle className="text-white">Welcome to Video Calls</CardTitle>
            <CardDescription className="text-gray-400">
              Please sign in to access your dashboard
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
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {session.user.name}!
              </h1>
              <p className="text-gray-400">
                Start a new video call or join an existing one
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/video-call/join')}
                variant="outline"
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                Join Call
              </Button>
              <Button
                onClick={() => router.push('/video-call/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Meeting
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Start */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Video className="w-5 h-5 mr-2 text-blue-500" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Start or join a meeting instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleQuickStart}
                    className="bg-blue-600 hover:bg-blue-700 h-20 text-lg"
                  >
                    <div className="text-center">
                      <Video className="w-8 h-8 mx-auto mb-2" />
                      Start Instant Meeting
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => router.push('/video-call/join')}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 h-20 text-lg"
                  >
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      Join with Code
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Calls */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <History className="w-5 h-5 mr-2 text-gray-400" />
                      Recent Calls
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Your recent video call history
                    </CardDescription>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-700 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : recentCalls.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent calls</p>
                    <p className="text-sm">Start your first video call to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCalls.slice(0, 5).map((call) => (
                      <div key={call.roomId} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-white font-medium">{call.roomName}</h3>
                              {call.isHost && (
                                <Badge variant="outline" className="text-xs">
                                  Host
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{call.participantCount} participants</span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDuration(call.duration)}</span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(call.startedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => copyInviteLink(call.roomCode)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            onClick={() => router.push(`/video-call/${call.roomId}`)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Features */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Features</CardTitle>
                <CardDescription className="text-gray-400">
                  What you can do with our video calls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Video className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">HD Video Calls</div>
                    <div className="text-gray-400 text-sm">Up to 50 participants</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Real-time Chat</div>
                    <div className="text-gray-400 text-sm">Instant messaging</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Screen Sharing</div>
                    <div className="text-gray-400 text-sm">Share your screen</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">File Sharing</div>
                    <div className="text-gray-400 text-sm">Share files up to 100MB</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <div>
                  <strong className="text-white">Quick Start:</strong> Use instant meetings for impromptu calls
                </div>
                
                <div>
                  <strong className="text-white">Room Codes:</strong> Share 6-8 character codes for easy joining
                </div>
                
                <div>
                  <strong className="text-white">Screen Share:</strong> Perfect for presentations and demos
                </div>
                
                <div>
                  <strong className="text-white">File Sharing:</strong> Upload documents, images, and more
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}