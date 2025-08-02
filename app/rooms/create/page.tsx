"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  Settings, 
  Lock, 
  Globe,
  Video,
  MessageSquare,
  FileText,
  Upload,
  Monitor
} from "lucide-react"
import Link from "next/link"

export default function CreateRoomPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    description: "",
    roomType: "discussion",
    maxParticipants: 8,
    isPrivate: false,
    settings: {
      allowScreenShare: true,
      allowFileSharing: true,
      allowChat: true,
      allowWhiteboard: true,
      recordSession: false,
    }
  })

  const subjects = [
    "Mathematics", "Physics", "Chemistry", "Biology", "English", 
    "History", "Geography", "Computer Science", "Economics", "Psychology",
    "Art", "Music", "Foreign Languages", "Philosophy", "Other"
  ]

  const roomTypes = [
    { value: "discussion", label: "Discussion", description: "Open discussion and collaboration" },
    { value: "silent", label: "Silent Study", description: "Quiet focused study time" },
    { value: "focus", label: "Focus Mode", description: "Pomodoro timer with breaks" },
    { value: "group", label: "Group Project", description: "Collaborative project work" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/rooms/${data.room._id}`)
      } else {
        const error = await response.json()
        alert(error.message || "Failed to create room")
      }
    } catch (error) {
      console.error("Create room error:", error)
      alert("Failed to create room")
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateSettings = (setting: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [setting]: value }
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold">Create Study Room</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Set up the basic details for your study room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  placeholder="e.g., AP Physics Study Group"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject} onValueChange={(value) => updateFormData("subject", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  placeholder="Describe what you'll be studying or working on..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Room Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Room Configuration
              </CardTitle>
              <CardDescription>
                Configure how your study room will work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roomType">Room Type</Label>
                <Select value={formData.roomType} onValueChange={(value) => updateFormData("roomType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <Select 
                  value={formData.maxParticipants.toString()} 
                  onValueChange={(value) => updateFormData("maxParticipants", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 10, 12, 15, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} participants
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    {formData.isPrivate ? <Lock className="w-4 h-4 mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                    Private Room
                  </Label>
                  <p className="text-sm text-gray-500">
                    {formData.isPrivate 
                      ? "Only people with the room code can join" 
                      : "Anyone can discover and join this room"
                    }
                  </p>
                </div>
                <Switch
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => updateFormData("isPrivate", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Features & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Features & Permissions</CardTitle>
              <CardDescription>
                Choose which features to enable in your room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    <div>
                      <Label>Screen Sharing</Label>
                      <p className="text-sm text-gray-500">Allow participants to share their screens</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.settings.allowScreenShare}
                    onCheckedChange={(checked) => updateSettings("allowScreenShare", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Upload className="w-5 h-5 text-green-600" />
                    <div>
                      <Label>File Sharing</Label>
                      <p className="text-sm text-gray-500">Allow uploading and sharing files</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.settings.allowFileSharing}
                    onCheckedChange={(checked) => updateSettings("allowFileSharing", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <div>
                      <Label>Text Chat</Label>
                      <p className="text-sm text-gray-500">Enable real-time text messaging</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.settings.allowChat}
                    onCheckedChange={(checked) => updateSettings("allowChat", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <div>
                      <Label>Collaborative Whiteboard</Label>
                      <p className="text-sm text-gray-500">Enable shared drawing and note-taking</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.settings.allowWhiteboard}
                    onCheckedChange={(checked) => updateSettings("allowWhiteboard", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Video className="w-5 h-5 text-red-600" />
                    <div>
                      <Label>Record Session</Label>
                      <p className="text-sm text-gray-500">Save the study session for later review</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.settings.recordSession}
                    onCheckedChange={(checked) => updateSettings("recordSession", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Room Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{formData.name || "Room Name"}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant={formData.isPrivate ? "secondary" : "default"}>
                      {formData.isPrivate ? "Private" : "Public"}
                    </Badge>
                    <Badge variant="outline">{formData.roomType}</Badge>
                  </div>
                </div>
                <p className="text-gray-600 mb-2">Subject: {formData.subject || "Not selected"}</p>
                <p className="text-sm text-gray-500 mb-3">
                  {formData.description || "No description provided"}
                </p>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  Up to {formData.maxParticipants} participants
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !formData.name || !formData.subject}>
              {loading ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}