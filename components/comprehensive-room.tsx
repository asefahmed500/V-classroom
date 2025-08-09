"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Users, 
  MessageSquare, 
  Palette, 
  Bot,
  Settings,
  Share2,
  Video,
  Mic,
  MicOff,
  VideoOff
} from 'lucide-react'
import EnhancedFileSharing from './enhanced-file-sharing'
import AdvancedWhiteboard from './advanced-whiteboard'
import MarkdownEditor from './markdown-editor'
import { toast } from 'sonner'

interface RoomUser {
  id: string
  name: string
  avatar?: string
  isMuted: boolean
  isVideoOn: boolean
  isOnline: boolean
  role: 'admin' | 'member'
}

interface ComprehensiveRoomProps {
  roomId: string
  currentUser: RoomUser
  onUserUpdate?: (users: RoomUser[]) => void
}

export default function ComprehensiveRoom({ 
  roomId, 
  currentUser, 
  onUserUpdate 
}: ComprehensiveRoomProps) {
  const [activeTab, setActiveTab] = useState('files')
  const [users, setUsers] = useState<RoomUser[]>([])
  const [roomSettings, setRoomSettings] = useState({
    allowFileSharing: true,
    allowWhiteboard: true,
    allowMarkdown: true,
    allowChat: true,
    maxUsers: 10,
    isPublic: false
  })
  const [isConnected, setIsConnected] = useState(false)
  const [localUser, setLocalUser] = useState<RoomUser>(currentUser)

  // Simulate WebSocket connection
  useEffect(() => {
    // Simulate connection
    setTimeout(() => {
      setIsConnected(true)
      toast.success('Connected to room')
    }, 1000)

    // Simulate other users joining
    const mockUsers: RoomUser[] = [
      {
        id: 'user-1',
        name: 'Alice Johnson',
        isMuted: false,
        isVideoOn: true,
        isOnline: true,
        role: 'member'
      },
      {
        id: 'user-2',
        name: 'Bob Smith',
        isMuted: true,
        isVideoOn: false,
        isOnline: true,
        role: 'member'
      }
    ]
    
    setTimeout(() => {
      setUsers(mockUsers)
      if (onUserUpdate) {
        onUserUpdate([localUser, ...mockUsers])
      }
    }, 2000)
  }, [roomId, localUser, onUserUpdate])

  // Toggle user audio
  const toggleAudio = () => {
    setLocalUser(prev => ({
      ...prev,
      isMuted: !prev.isMuted
    }))
    toast.success(localUser.isMuted ? 'Microphone unmuted' : 'Microphone muted')
  }

  // Toggle user video
  const toggleVideo = () => {
    setLocalUser(prev => ({
      ...prev,
      isVideoOn: !prev.isVideoOn
    }))
    toast.success(localUser.isVideoOn ? 'Camera turned off' : 'Camera turned on')
  }

  // Mute/unmute other user (admin only)
  const toggleUserAudio = (userId: string) => {
    if (localUser.role !== 'admin') {
      toast.error('Only admins can mute/unmute users')
      return
    }

    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isMuted: !user.isMuted } : user
    ))
    
    const user = users.find(u => u.id === userId)
    toast.success(`${user?.name} ${user?.isMuted ? 'unmuted' : 'muted'}`)
  }

  // Remove user from room (admin only)
  const removeUser = (userId: string) => {
    if (localUser.role !== 'admin') {
      toast.error('Only admins can remove users')
      return
    }

    const user = users.find(u => u.id === userId)
    setUsers(prev => prev.filter(user => user.id !== userId))
    toast.success(`${user?.name} removed from room`)
  }

  // Share room
  const shareRoom = () => {
    const shareUrl = `${window.location.origin}/rooms/${roomId}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Room link copied to clipboard')
  }

  // Update room settings
  const updateRoomSettings = (key: string, value: any) => {
    if (localUser.role !== 'admin') {
      toast.error('Only admins can change room settings')
      return
    }

    setRoomSettings(prev => ({
      ...prev,
      [key]: value
    }))
    toast.success('Room settings updated')
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Room Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Study Room: {roomId}</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
            <span className="text-sm text-gray-600">•</span>
            <span className="text-sm text-gray-600">
              {users.length + 1} user{users.length !== 0 ? 's' : ''} online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Media Controls */}
          <Button
            variant={localUser.isMuted ? "destructive" : "outline"}
            onClick={toggleAudio}
          >
            {localUser.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={localUser.isVideoOn ? "outline" : "destructive"}
            onClick={toggleVideo}
          >
            {localUser.isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>

          <Button variant="outline" onClick={shareRoom}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Room
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Files
              </TabsTrigger>
              <TabsTrigger value="whiteboard" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Whiteboard
              </TabsTrigger>
              <TabsTrigger value="markdown" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI Assistant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="mt-6">
              {roomSettings.allowFileSharing ? (
                <EnhancedFileSharing />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">File sharing is disabled in this room</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="whiteboard" className="mt-6">
              {roomSettings.allowWhiteboard ? (
                <AdvancedWhiteboard 
                  roomId={roomId}
                  onSave={(elements) => {
                    // Save whiteboard data
                    console.log('Saving whiteboard:', elements)
                  }}
                  onShare={(shareUrl) => {
                    navigator.clipboard.writeText(shareUrl)
                    toast.success('Whiteboard shared')
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Whiteboard is disabled in this room</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="markdown" className="mt-6">
              {roomSettings.allowMarkdown ? (
                <MarkdownEditor 
                  onSave={(content) => {
                    // Save markdown content
                    console.log('Saving markdown:', content)
                    toast.success('Notes saved')
                  }}
                  placeholder="Take collaborative notes using Markdown..."
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Markdown editor is disabled in this room</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    AI Study Assistant (Gemini 2.5 Pro)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium mb-2">What can I help you with?</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Explain concepts and answer questions</li>
                        <li>• Help with homework and assignments</li>
                        <li>• Provide study tips and techniques</li>
                        <li>• Analyze uploaded files and documents</li>
                        <li>• Generate summaries and notes</li>
                      </ul>
                    </div>
                    
                    <div className="text-center py-8">
                      <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        AI Assistant is integrated into the file sharing panel.
                        Upload files and ask questions to get started!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Users Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({users.length + 1})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current User */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {localUser.name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{localUser.name}</p>
                    <p className="text-sm text-gray-500">{localUser.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {localUser.isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                  {!localUser.isVideoOn && <VideoOff className="w-4 h-4 text-red-500" />}
                </div>
              </div>

              {/* Other Users */}
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name[0]}
                      </div>
                      {user.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {user.isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                    {!user.isVideoOn && <VideoOff className="w-4 h-4 text-red-500" />}
                    
                    {localUser.role === 'admin' && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserAudio(user.id)}
                          className="p-1"
                        >
                          {user.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUser(user.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Room Settings (Admin Only) */}
          {localUser.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Room Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">File Sharing</span>
                    <input
                      type="checkbox"
                      checked={roomSettings.allowFileSharing}
                      onChange={(e) => updateRoomSettings('allowFileSharing', e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Whiteboard</span>
                    <input
                      type="checkbox"
                      checked={roomSettings.allowWhiteboard}
                      onChange={(e) => updateRoomSettings('allowWhiteboard', e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Markdown Notes</span>
                    <input
                      type="checkbox"
                      checked={roomSettings.allowMarkdown}
                      onChange={(e) => updateRoomSettings('allowMarkdown', e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Public Room</span>
                    <input
                      type="checkbox"
                      checked={roomSettings.isPublic}
                      onChange={(e) => updateRoomSettings('isPublic', e.target.checked)}
                      className="rounded"
                    />
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Max Users</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={roomSettings.maxUsers}
                    onChange={(e) => updateRoomSettings('maxUsers', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}