"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Users, 
  Lock, 
  Globe, 
  Settings,
  Loader2,
  Copy,
  ExternalLink
} from "lucide-react"

interface CreateRoomFormProps {
  onRoomCreated?: (roomData: any) => void
}

export function CreateRoomForm({ onRoomCreated }: CreateRoomFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    description: "",
    maxParticipants: 8,
    privacy: "public",
    settings: {
      allowChat: true,
      allowScreenShare: true,
      allowFileShare: true,
      allowWhiteboard: true,
      allowNotes: true
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdRoom, setCreatedRoom] = useState<any>(null)
  const router = useRouter()

  const subjects = [
    "Mathematics",
    "Physics", 
    "Chemistry",
    "Biology",
    "Computer Science",
    "Engineering",
    "Literature",
    "History",
    "Economics",
    "Psychology",
    "Art & Design",
    "Music",
    "Languages",
    "Business",
    "Medicine",
    "Law",
    "Other"
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSettingChange = (setting: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.subject) {
      setError("Room name and subject are required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Room creation response:', result)
        console.log('Room code from API:', result.room?.roomCode)
        console.log('Room ID from API:', result.room?._id)
        setCreatedRoom(result.room)
        onRoomCreated?.(result.room)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create room")
      }
    } catch (error) {
      console.error("Error creating room:", error)
      setError("Failed to create room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyRoomCode = () => {
    if (createdRoom?.roomCode) {
      navigator.clipboard.writeText(createdRoom.roomCode)
    }
  }

  const copyRoomLink = () => {
    if (createdRoom?.roomCode) {
      const roomLink = `${window.location.origin}/join?code=${createdRoom.roomCode}`
      navigator.clipboard.writeText(roomLink)
    }
  }

  const joinRoom = () => {
    if (createdRoom?._id) {
      router.push(`/rooms/${createdRoom._id}`)
    }
  }

  if (createdRoom) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-600">
            Room Created Successfully! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{createdRoom.name}</h3>
            <Badge variant="outline">📚 {createdRoom.subject}</Badge>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="text-center">
              <Label className="text-sm font-medium">Room Code</Label>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <span className="text-2xl font-mono font-bold tracking-wider">
                  {createdRoom.roomCode || 'NO_CODE'}
                </span>
                <Button onClick={copyRoomCode} size="sm" variant="ghost">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {/* Debug info */}
              <div className="text-xs text-gray-500 mt-2">
                Debug: roomCode={createdRoom.roomCode}, _id={createdRoom._id}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={copyRoomLink} variant="outline" className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={joinRoom} className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                Enter Room
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-600 text-center">
            Share the room code or link with others to invite them
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Create Study Room
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Room Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Calculus Study Group"
                maxLength={100}
                required
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select 
                value={formData.subject} 
                onValueChange={(value) => handleInputChange("subject", value)}
              >
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of what you'll be studying..."
                maxLength={500}
                rows={3}
              />
            </div>
          </div>

          {/* Room Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Room Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Select 
                  value={formData.maxParticipants.toString()} 
                  onValueChange={(value) => handleInputChange("maxParticipants", parseInt(value))}
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

              <div>
                <Label htmlFor="privacy">Privacy</Label>
                <Select 
                  value={formData.privacy} 
                  onValueChange={(value) => handleInputChange("privacy", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        Public
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        Private
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Feature Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Allowed Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="allowChat">Chat Messages</Label>
                <Switch
                  id="allowChat"
                  checked={formData.settings.allowChat}
                  onCheckedChange={(checked) => handleSettingChange("allowChat", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allowScreenShare">Screen Sharing</Label>
                <Switch
                  id="allowScreenShare"
                  checked={formData.settings.allowScreenShare}
                  onCheckedChange={(checked) => handleSettingChange("allowScreenShare", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allowFileShare">File Sharing</Label>
                <Switch
                  id="allowFileShare"
                  checked={formData.settings.allowFileShare}
                  onCheckedChange={(checked) => handleSettingChange("allowFileShare", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allowWhiteboard">Whiteboard</Label>
                <Switch
                  id="allowWhiteboard"
                  checked={formData.settings.allowWhiteboard}
                  onCheckedChange={(checked) => handleSettingChange("allowWhiteboard", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allowNotes">Collaborative Notes</Label>
                <Switch
                  id="allowNotes"
                  checked={formData.settings.allowNotes}
                  onCheckedChange={(checked) => handleSettingChange("allowNotes", checked)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Room...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}