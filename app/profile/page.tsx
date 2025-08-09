"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Mail,
  Calendar,
  Settings,
  LogOut,
  ArrowLeft,
  Edit,
  Save,
  X,
  Trophy,
  Clock,
  Target,
  BookOpen,
  Users,
  Video,
  Brain,
  Star,
  TrendingUp,
  Award,
  Shield,
  Bell,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"

interface UserProfile {
  name: string
  email: string
  joinedAt: string
  studyPreferences: {
    subjects: string[]
    studyTimes: string[]
    goals: string
  }
  stats: {
    totalStudyTime: number
    studySessions: number
    achievements: number
    currentStreak: number
  }
  settings: {
    notifications: boolean
    publicProfile: boolean
    emailUpdates: boolean
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    subjects: "",
    goals: ""
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setProfile(data.profile)
          setEditForm({
            name: data.profile.name || '',
            subjects: (data.profile.studyPreferences?.subjects || []).join(", "),
            goals: data.profile.studyPreferences?.goals || ''
          })
        } else {
          throw new Error('Failed to fetch profile')
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
        // Set default profile if API fails
        const defaultProfile = {
          name: session.user.name || "User",
          email: session.user.email || "",
          joinedAt: new Date().toISOString(),
          studyPreferences: {
            subjects: ["Mathematics", "Science"],
            studyTimes: ["Morning", "Evening"],
            goals: "Improve academic performance"
          },
          stats: {
            totalStudyTime: 0,
            studySessions: 0,
            achievements: 0,
            currentStreak: 0
          },
          settings: {
            notifications: true,
            publicProfile: false,
            emailUpdates: true
          }
        }
        setProfile(defaultProfile)
        setEditForm({
          name: defaultProfile.name,
          subjects: defaultProfile.studyPreferences.subjects.join(", "),
          goals: defaultProfile.studyPreferences.goals
        })
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      loadProfile()
    }
  }, [session])

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await signOut({ callbackUrl: "/" })
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          studyPreferences: {
            subjects: editForm.subjects.split(",").map(s => s.trim()).filter(s => s),
            goals: editForm.goals.trim()
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditing(false)
        // Show success message
        console.log('Profile updated successfully')
      } else {
        const errorData = await response.json()
        console.error('Failed to update profile:', errorData.error)
        alert('Failed to update profile. Please try again.')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    }
  }

  const updateSettings = async (key: string, value: boolean) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })

      if (response.ok && profile) {
        setProfile({
          ...profile,
          settings: {
            ...profile.settings,
            [key]: value
          }
        })
        console.log(`Setting ${key} updated to ${value}`)
      } else {
        const errorData = await response.json()
        console.error('Failed to update settings:', errorData.error)
        alert('Failed to update settings. Please try again.')
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert('Failed to update settings. Please try again.')
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please sign in to view your profile.</p>
          <Link href="/auth/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-600">Manage your account and preferences</p>
              </div>
            </div>
            
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-0">
              <CardContent className="p-6 text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-2xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h2>
                <p className="text-gray-600 text-sm mb-2">{profile.email}</p>
                <Badge className="bg-blue-100 text-blue-700 mb-4">
                  <Calendar className="w-3 h-3 mr-1" />
                  Joined {formatJoinDate(profile.joinedAt)}
                </Badge>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{profile.stats.studySessions}</div>
                    <div className="text-xs text-gray-600">Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{profile.stats.totalStudyTime}h</div>
                    <div className="text-xs text-gray-600">Study Time</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{profile.stats.achievements}</div>
                    <div className="text-xs text-gray-600">Achievements</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{profile.stats.currentStreak}</div>
                    <div className="text-xs text-gray-600">Day Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="achievements" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Achievements
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your profile details and study preferences</CardDescription>
                      </div>
                      {!editing ? (
                        <Button onClick={() => setEditing(true)} variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveProfile} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        {editing ? (
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 p-2 bg-gray-50 rounded border">{profile.name}</div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <div className="mt-1 p-2 bg-gray-50 rounded border text-gray-600">
                          {profile.email} (Cannot be changed)
                        </div>
                      </div>
                    </div>

                    {/* Study Preferences */}
                    <div>
                      <Label htmlFor="subjects">Favorite Subjects</Label>
                      {editing ? (
                        <Input
                          id="subjects"
                          value={editForm.subjects}
                          onChange={(e) => setEditForm({...editForm, subjects: e.target.value})}
                          placeholder="Mathematics, Science, History (comma separated)"
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {profile.studyPreferences.subjects.map((subject, index) => (
                            <Badge key={index} variant="secondary">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="goals">Study Goals</Label>
                      {editing ? (
                        <Input
                          id="goals"
                          value={editForm.goals}
                          onChange={(e) => setEditForm({...editForm, goals: e.target.value})}
                          placeholder="What are your study goals?"
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 p-2 bg-gray-50 rounded border">{profile.studyPreferences.goals}</div>
                      )}
                    </div>

                    {/* Preferred Study Times */}
                    <div>
                      <Label>Preferred Study Times</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.studyPreferences.studyTimes.map((time, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-700">
                            <Clock className="w-3 h-3 mr-1" />
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements">
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                      Achievements & Progress
                    </CardTitle>
                    <CardDescription>Track your learning milestones and accomplishments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Achievement Badges */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Earned Badges</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 text-center">
                            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <div className="text-sm font-medium text-gray-900">First Session</div>
                            <div className="text-xs text-gray-600">Completed your first study session</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 text-center">
                            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <div className="text-sm font-medium text-gray-900">Team Player</div>
                            <div className="text-xs text-gray-600">Joined 5 study groups</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 text-center">
                            <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <div className="text-sm font-medium text-gray-900">Consistent</div>
                            <div className="text-xs text-gray-600">7-day study streak</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 text-center">
                            <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                            <div className="text-sm font-medium text-gray-900">AI Helper</div>
                            <div className="text-xs text-gray-600">Used AI tutor 10 times</div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Stats */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Progress Overview</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">Study Sessions</span>
                              <span className="text-sm text-gray-600">{profile.stats.studySessions}/50</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min((profile.stats.studySessions / 50) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">Study Hours</span>
                              <span className="text-sm text-gray-600">{profile.stats.totalStudyTime}/100h</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${Math.min((profile.stats.totalStudyTime / 100) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">Current Streak</span>
                              <span className="text-sm text-gray-600">{profile.stats.currentStreak} days</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(7)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-4 h-4 rounded ${
                                    i < profile.stats.currentStreak ? 'bg-orange-500' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-gray-600" />
                      Account Settings
                    </CardTitle>
                    <CardDescription>Manage your privacy and notification preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Notification Settings */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Notifications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Bell className="w-5 h-5 text-gray-600" />
                            <div>
                              <div className="font-medium text-gray-900">Push Notifications</div>
                              <div className="text-sm text-gray-600">Get notified about study reminders and room invites</div>
                            </div>
                          </div>
                          <Button
                            variant={profile.settings.notifications ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateSettings('notifications', !profile.settings.notifications)}
                          >
                            {profile.settings.notifications ? 'On' : 'Off'}
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-gray-600" />
                            <div>
                              <div className="font-medium text-gray-900">Email Updates</div>
                              <div className="text-sm text-gray-600">Receive weekly progress reports and tips</div>
                            </div>
                          </div>
                          <Button
                            variant={profile.settings.emailUpdates ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateSettings('emailUpdates', !profile.settings.emailUpdates)}
                          >
                            {profile.settings.emailUpdates ? 'On' : 'Off'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Privacy</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {profile.settings.publicProfile ? (
                              <Eye className="w-5 h-5 text-gray-600" />
                            ) : (
                              <EyeOff className="w-5 h-5 text-gray-600" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">Public Profile</div>
                              <div className="text-sm text-gray-600">Allow others to see your study stats and achievements</div>
                            </div>
                          </div>
                          <Button
                            variant={profile.settings.publicProfile ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateSettings('publicProfile', !profile.settings.publicProfile)}
                          >
                            {profile.settings.publicProfile ? 'Public' : 'Private'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Account Actions */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Account Actions</h3>
                      <div className="space-y-3">
                        <Button 
                          onClick={handleLogout}
                          variant="destructive" 
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout from Account
                        </Button>
                      </div>
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