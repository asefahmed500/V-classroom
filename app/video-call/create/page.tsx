"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { 
  Video, Users, Settings, Shield, 
  FileText, MessageSquare, Monitor,
  Clock, Globe, Lock, Zap
} from "lucide-react"
import { toast } from "sonner"

export default function CreateVideoCallPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const [roomName, setRoomName] = useState("")
  const [maxParticipants, setMaxParticipants] = useState([25])
  const [settings, setSettings] = useState({
    allowScreenShare: true,
    allowFileShare: true,
    allowChat: true,
    requireApproval: false,
    recordingEnabled: false
  })
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name")
      return
    }

    if (!session?.user) {
      toast.error("Please sign in to create a video call")
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/video-calls/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomName: roomName.trim(),
          maxParticipants: maxParticipants[0],
          settings
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Video call created successfully!")
        router.push(`/video-call/${data.videoCall.roomId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create video call")
      }
    } catch (error) {
      console.error("Error creating video call:", error)
      toast.error("Failed to create video call")
    } finally {
      setIsCreating(false)
    }
  }

  const handleQuickStart = async () => {
    const quickRoomName = `${session?.user?.name || 'User'}'s Meeting`
    setRoomName(quickRoomName)
    
    // Use default settings for quick start
    setTimeout(() => {
      handleCreate()
    }, 100)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <Video className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <CardTitle className="text-white">Sign In Required</CardTitle>
            <CardDescription className="text-gray-400">
              Please sign in to create a video call
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
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Video className="w-12 h-12 text-blue-500 mr-3" />
            <h1 className="text-3xl font-bold text-white">Create Video Call</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Start a new video call with advanced features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Start */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                  Quick Start
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Start a meeting instantly with default settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleQuickStart}
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                >
                  {isCreating ? "Creating..." : "Start Instant Meeting"}
                </Button>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-sm text-gray-400">
                    <Users className="w-4 h-4 mr-2" />
                    Up to 25 participants
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Real-time chat enabled
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Monitor className="w-4 h-4 mr-2" />
                    Screen sharing enabled
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <FileText className="w-4 h-4 mr-2" />
                    File sharing enabled
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Custom Settings */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-gray-400" />
                  Custom Settings
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure your video call with custom settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Room Name */}
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-white">
                    Room Name *
                  </Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter room name..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Max Participants */}
                <div className="space-y-3">
                  <Label className="text-white">
                    Maximum Participants: {maxParticipants[0]}
                  </Label>
                  <Slider
                    value={maxParticipants}
                    onValueChange={setMaxParticipants}
                    max={50}
                    min={2}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>2</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <Label className="text-white text-lg">Features</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="text-white font-medium">Real-time Chat</div>
                          <div className="text-gray-400 text-sm">Enable text messaging</div>
                        </div>
                      </div>
                      <Switch
                        checked={settings.allowChat}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, allowChat: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="text-white font-medium">Screen Sharing</div>
                          <div className="text-gray-400 text-sm">Share your screen</div>
                        </div>
                      </div>
                      <Switch
                        checked={settings.allowScreenShare}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, allowScreenShare: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-purple-500" />
                        <div>
                          <div className="text-white font-medium">File Sharing</div>
                          <div className="text-gray-400 text-sm">Share files with participants</div>
                        </div>
                      </div>
                      <Switch
                        checked={settings.allowFileShare}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, allowFileShare: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-yellow-500" />
                        <div>
                          <div className="text-white font-medium">Require Approval</div>
                          <div className="text-gray-400 text-sm">Host approves participants</div>
                        </div>
                      </div>
                      <Switch
                        checked={settings.requireApproval}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, requireApproval: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Create Button */}
                <div className="pt-4">
                  <Button 
                    onClick={handleCreate}
                    disabled={isCreating || !roomName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                  >
                    {isCreating ? "Creating Video Call..." : "Create Video Call"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Powerful Video Calling Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <Video className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">HD Video Calls</h3>
              <p className="text-gray-400 text-sm">
                Crystal clear video quality with up to 50 participants
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <MessageSquare className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Real-time Chat</h3>
              <p className="text-gray-400 text-sm">
                Instant messaging with emoji reactions and file sharing
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <Monitor className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Screen Sharing</h3>
              <p className="text-gray-400 text-sm">
                Share your screen with all participants seamlessly
              </p>
            </div>
            
            <div className="text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <FileText className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">File Sharing</h3>
              <p className="text-gray-400 text-sm">
                Upload and share files up to 100MB with all participants
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}