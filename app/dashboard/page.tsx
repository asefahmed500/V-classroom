"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Users, Clock, BookOpen, Search, Video, Calendar } from "lucide-react"
import Link from "next/link"
import { RoomCodeInput } from "@/components/room-code-input"

interface StudyRoom {
  _id: string
  name: string
  subject: string
  participants: number
  maxParticipants: number
  isActive: boolean
  createdAt: string
}

export default function DashboardPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms")
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error)
      setRooms([]) // Ensure rooms is always an array
    } finally {
      setLoading(false)
    }
  }

  const filteredRooms = (rooms || []).filter(
    (room) =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const [userStats, setUserStats] = useState({
    totalStudyTime: 0,
    roomsJoined: 0,
    studyStreak: 0,
  })

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/user/stats")
      if (response.ok) {
        const data = await response.json()
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Virtual Study Rooms</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/rooms/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline">Profile</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, Student!</h1>
          <p className="text-gray-600">Ready to dive into your studies? Join a room or create your own.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalStudyTime}h</div>
              <p className="text-xs text-muted-foreground">+2h from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rooms Joined</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.roomsJoined}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.studyStreak} days</div>
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Rooms Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Active Study Rooms</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading rooms...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <Card key={room._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                      <Badge variant={room.isActive ? "default" : "secondary"}>
                        {room.isActive ? "Active" : "Waiting"}
                      </Badge>
                    </div>
                    <CardDescription>Subject: {room.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {room.participants}/{room.maxParticipants} participants
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(room.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Link href={`/rooms/${room._id}`}>
                      <Button className="w-full">
                        <Video className="w-4 h-4 mr-2" />
                        Join Room
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredRooms.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active rooms found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Be the first to create a study room!"}
                </p>
                <Link href="/rooms/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Room
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <RoomCodeInput />

          <Card>
            <CardHeader>
              <CardTitle>AI Study Assistant</CardTitle>
              <CardDescription>Get help with your studies</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/ai-assistant">
                <Button className="w-full bg-transparent" variant="outline">
                  Chat with AI Tutor
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
