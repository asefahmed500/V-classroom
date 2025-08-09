"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Video,
  Users,
  Clock,
  Brain,
  BookOpen,
  Trophy,
  Calendar,
  Plus,
  ArrowRight,
  Star,
  TrendingUp,
  Target,
  Zap,
  Play,
  Settings,
  LogOut,
  Eye,
  Trash2,
  Lock,
  Globe
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    studySessions: 0,
    totalStudyTime: 0,
    achievements: 0,
    currentStreak: 0
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const loadUserStats = async () => {
      if (!session?.user?.id) return
      
      try {
        const response = await fetch('/api/user/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to load user stats:', error)
      }
    }

    loadUserStats()
  }, [session?.user?.id])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  // Remove fake data - these will be replaced with real data from API calls

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {session.user?.name}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-red-600 hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Link href="/profile">
                <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    {getInitials(session.user?.name || "User")}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/rooms/create" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 group">
                <Plus className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Create Study Room
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/rooms/join" className="flex-1">
              <Button variant="outline" className="w-full py-6 text-lg font-semibold border-2 border-gray-300 hover:border-blue-300 hover:bg-blue-50 group">
                <Users className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Join Study Room
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Study Sessions</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.studySessions}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Study Time</p>
                  <p className="text-3xl font-bold text-green-900">{stats.totalStudyTime}h</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Achievements</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.achievements}</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Current Streak</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.currentStreak} days</p>
                </div>
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* My Rooms */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">My Study Rooms</CardTitle>
                    <CardDescription>Rooms you've created and manage</CardDescription>
                  </div>
                  <Link href="/rooms/create">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-3 h-3 mr-1" />
                      Create Room
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <MyRoomsList userId={session?.user?.id || ''} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/rooms/join">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Users className="w-4 h-4 mr-2" />
                    Join Study Room
                  </Button>
                </Link>
                
                <Link href="/rooms">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse All Rooms
                  </Button>
                </Link>
                
                <Link href="/test-systems">
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Test Systems
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* AI Study Assistant */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  AI Study Assistant
                </CardTitle>
                <CardDescription>Get personalized study recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900">Today's Focus</span>
                    </div>
                    <p className="text-sm text-gray-600">Review calculus derivatives for tomorrow's exam</p>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">Quick Practice</span>
                    </div>
                    <p className="text-sm text-gray-600">5 chemistry problems available</p>
                  </div>
                </div>
                
                <Link href="/ai-assistant">
                  <Button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Brain className="w-4 h-4 mr-2" />
                    Open AI Assistant
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// My Rooms List Component
function MyRoomsList({ userId }: { userId: string }) {
  const { data: session } = useSession()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMyRooms = async () => {
      if (!userId) return
      
      try {
        const response = await fetch(`/api/rooms/list?type=created&limit=5`)
        if (response.ok) {
          const data = await response.json()
          setRooms(data.rooms || [])
        }
      } catch (error) {
        console.error('Failed to load rooms:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMyRooms()
  }, [userId])

  const deleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.user?.id })
      })

      if (response.ok) {
        setRooms(prev => prev.filter(room => room.roomId !== roomId))
        alert('Room deleted successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete room')
      }
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('Failed to delete room')
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading your rooms...</div>
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600 mb-4">You haven't created any rooms yet</p>
        <Link href="/rooms/create">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Room
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <div key={room.roomId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{room.name}</h4>
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <span>{room.subject}</span>
                <span>•</span>
                <span>{room.participantCount}/{room.maxParticipants} participants</span>
                {room.privacy === 'private' ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Link href={`/rooms/${room.roomId}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Eye className="w-3 h-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteRoom(room.roomId)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
      
      <Link href="/rooms?tab=created">
        <Button variant="outline" size="sm" className="w-full mt-3">
          View All My Rooms
          <ArrowRight className="w-3 h-3 ml-2" />
        </Button>
      </Link>
    </div>
  )
}