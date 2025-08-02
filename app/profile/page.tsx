"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Mail, 
  School, 
  GraduationCap, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen,
  Settings,
  Shield,
  Bell,
  Camera,
  Edit3,
  Save,
  ArrowLeft,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface UserProfile {
  _id: string
  name: string
  email: string
  grade: string
  school: string
  bio?: string
  avatar?: string
  studyStats: {
    totalStudyTime: number
    roomsJoined: number
    studyStreak: number
  }
  preferences: {
    notifications: boolean
    publicProfile: boolean
    showOnlineStatus: boolean
  }
  createdAt: string
}

interface UserRoom {
  _id: string
  name: string
  subject: string
  roomType: string
  participants: number
  maxParticipants: number
  isHost: boolean
  createdAt: string
  lastActive: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userRooms, setUserRooms] = useState<UserRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    grade: "",
    school: "",
    bio: "",
    preferences: {
      notifications: true,
      publicProfile: true,
      showOnlineStatus: true,
    }
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchUserProfile()
    fetchUserRooms()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setFormData({
          name: userData.name,
          email: userData.email,
          grade: userData.grade,
          school: userData.school,
          bio: userData.bio || "",
          preferences: userData.preferences || {
            notifications: true,
            publicProfile: true,
            showOnlineStatus: true,
          }
        })
      } else {
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRooms = async () => {
    try {
      const response = await fetch("/api/user/rooms")
      if (response.ok) {
        const data = await response.json()
        setUserRooms(data.rooms || [])
      }
    } catch (error) {
      console.error("Failed to fetch user rooms:", error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser.user)
        setEditing(false)
        toast({
          title: "Success!",
          description: "Profile updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setUserRooms(prev => prev.filter(room => room._id !== roomId))
        toast({
          title: "Success!",
          description: "Room deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete room",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">My Profile</h1>
            </div>
            <div className="flex items-center space-x-2">
              {editing ? (
                <>
                  <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)} size="sm">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
              <Button onClick={handleLogout} variant="destructive" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {editing && (
                    <Button size="sm" className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <Camera className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <h2 className="text-xl font-bold mb-1">{user.name}</h2>
                <p className="text-gray-600 mb-2">{user.email}</p>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Badge variant="outline">{user.grade}th Grade</Badge>
                  <Badge variant="outline">{user.school}</Badge>
                </div>
                
                {user.bio && (
                  <p className="text-sm text-gray-600 mb-4">{user.bio}</p>
                )}

                <div className="text-xs text-gray-500">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Study Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Study Time</span>
                  </div>
                  <span className="font-semibold">{user.studyStats.totalStudyTime}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Rooms Joined</span>
                  </div>
                  <span className="font-semibold">{user.studyStats.roomsJoined}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Study Streak</span>
                  </div>
                  <span className="font-semibold">{user.studyStats.studyStreak} days</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile Info</TabsTrigger>
                <TabsTrigger value="rooms">My Rooms</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          disabled={!editing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!editing}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="grade">Grade Level</Label>
                        <Select 
                          value={formData.grade} 
                          onValueChange={(value) => setFormData({ ...formData, grade: value })}
                          disabled={!editing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9">9th Grade</SelectItem>
                            <SelectItem value="10">10th Grade</SelectItem>
                            <SelectItem value="11">11th Grade</SelectItem>
                            <SelectItem value="12">12th Grade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="school">School Name</Label>
                        <Input
                          id="school"
                          value={formData.school}
                          onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                          disabled={!editing}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio (Optional)</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself, your study interests, goals..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={!editing}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rooms Tab */}
              <TabsContent value="rooms" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>My Study Rooms ({userRooms.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userRooms.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">You haven't created any rooms yet</p>
                        <Link href="/rooms/create">
                          <Button>Create Your First Room</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userRooms.map((room) => (
                          <div key={room._id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold">{room.name}</h3>
                                  <Badge variant="outline">{room.subject}</Badge>
                                  {room.isHost && <Badge>Host</Badge>}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>{room.participants}/{room.maxParticipants} participants</span>
                                  <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                                  <span>Last active {new Date(room.lastActive).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Link href={`/rooms/${room._id}`}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                {room.isHost && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDeleteRoom(room._id)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy & Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Email Notifications</div>
                          <div className="text-sm text-gray-600">Receive emails about room invitations and updates</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.preferences.notifications}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, notifications: e.target.checked }
                        })}
                        disabled={!editing}
                        className="w-4 h-4"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">Public Profile</div>
                          <div className="text-sm text-gray-600">Allow others to see your profile information</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.preferences.publicProfile}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, publicProfile: e.target.checked }
                        })}
                        disabled={!editing}
                        className="w-4 h-4"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Show Online Status</div>
                          <div className="text-sm text-gray-600">Let others see when you're online</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.preferences.showOnlineStatus}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: { ...formData.preferences, showOnlineStatus: e.target.checked }
                        })}
                        disabled={!editing}
                        className="w-4 h-4"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-600 mb-2">Delete Account</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}