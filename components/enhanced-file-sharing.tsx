"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Download, 
  File, 
  Image, 
  FileText, 
  Archive,
  Video,
  Music,
  Trash2,
  Eye,
  Share2,
  Search,
  X,
  Users,
  Mic,
  MicOff,
  UserX,
  MessageSquare,
  Bot
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

interface FileData {
  id: string
  name: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: Date
  downloadCount: number
  isShared: boolean
  url?: string
  thumbnail?: string
}

interface User {
  id: string
  name: string
  avatar?: string
  isMuted: boolean
  isOnline: boolean
  role: 'admin' | 'member'
}



interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: 'text' | 'file' | 'system'
}

export default function EnhancedFileSharing() {
  const [files, setFiles] = useState<FileData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [showChat, setShowChat] = useState(false)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentUser] = useState<User>({
    id: 'current-user',
    name: 'You',
    isMuted: false,
    isOnline: true,
    role: 'admin'
  })

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Add some demo users for testing
  useEffect(() => {
    const demoUsers: User[] = [
      {
        id: 'user-1',
        name: 'Alice Johnson',
        isMuted: false,
        isOnline: true,
        role: 'member'
      },
      {
        id: 'user-2',
        name: 'Bob Smith',
        isMuted: true,
        isOnline: true,
        role: 'member'
      }
    ]
    
    // Add demo users after a short delay to simulate real users joining
    setTimeout(() => {
      setUsers(demoUsers)
    }, 2000)
  }, [])

  // File upload with drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const fileId = `file-${Date.now()}-${Math.random()}`
      const newFile: FileData = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: currentUser.name,
        uploadedAt: new Date(),
        downloadCount: 0,
        isShared: true
      }

      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const progress = prev[fileId] + 10
          if (progress >= 100) {
            clearInterval(interval)
            setFiles(prevFiles => [...prevFiles, newFile])
            setTimeout(() => {
              setUploadProgress(prev => {
                const { [fileId]: _, ...rest } = prev
                return rest
              })
            }, 1000)
            return { ...prev, [fileId]: 100 }
          }
          return { ...prev, [fileId]: progress }
        })
      }, 200)

      toast.success(`Uploading ${file.name}...`)
    })
  }, [currentUser.name])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024 // 100MB
  })

  // File operations
  const downloadFile = (file: FileData) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, downloadCount: f.downloadCount + 1 } : f
    ))
    toast.success(`Downloading ${file.name}`)
  }

  const deleteFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('File deleted')
  }

  const shareFile = (file: FileData) => {
    navigator.clipboard.writeText(`${window.location.origin}/files/${file.id}`)
    toast.success('File link copied to clipboard')
  }

  // User management
  const muteUser = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isMuted: !user.isMuted } : user
    ))
    const user = users.find(u => u.id === userId)
    toast.success(`${user?.name} ${user?.isMuted ? 'unmuted' : 'muted'}`)
  }

  const removeUser = (userId: string) => {
    if (currentUser.role !== 'admin') {
      toast.error('Only admins can remove users')
      return
    }
    setUsers(prev => prev.filter(user => user.id !== userId))
    const user = users.find(u => u.id === userId)
    toast.success(`${user?.name} removed from room`)
  }

  // Chat functionality
  const sendMessage = () => {
    if (!chatInput.trim()) return
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      message: chatInput,
      timestamp: new Date(),
      type: 'text'
    }
    
    setChatMessages(prev => [...prev, message])
    setChatInput('')
  }

  // AI Assistant with Gemini 2.5 Pro
  const askAI = async () => {
    if (!aiInput.trim()) return
    
    setIsAiLoading(true)
    try {
      // Simulate AI response (replace with actual Gemini API call)
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiInput,
          context: {
            files: files.map(f => ({ name: f.name, type: f.type })),
            users: users.length,
            currentActivity: 'file-sharing'
          }
        })
      })
      
      const data = await response.json()
      setAiResponse(data.response || 'AI response would appear here')
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        userId: 'ai-assistant',
        userName: 'AI Assistant',
        message: data.response || 'AI response would appear here',
        timestamp: new Date(),
        type: 'text'
      }
      setChatMessages(prev => [...prev, aiMessage])
      
    } catch (error) {
      toast.error('Failed to get AI response')
    } finally {
      setIsAiLoading(false)
      setAiInput('')
    }
  }

  // Whiteboard functionality
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearWhiteboard = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    toast.success('Whiteboard cleared')
  }

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || file.type.startsWith(filterType)
    return matchesSearch && matchesFilter
  })

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-4 h-4" />
    if (type.includes('zip') || type.includes('archive')) return <Archive className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Study Room Collaboration
              </h1>
              <p className="text-gray-600 mt-1">Share files, chat, and collaborate in real-time</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showChat ? "default" : "outline"}
                onClick={() => setShowChat(!showChat)}
                className="rounded-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {isMobile ? '' : 'Chat'}
              </Button>
              <Button
                variant={showWhiteboard ? "default" : "outline"}
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="rounded-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                {isMobile ? '' : 'Whiteboard'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 md:space-y-6">
            {/* Modern Upload Area */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors ${
                      isDragActive ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    {isDragActive ? (
                      <div>
                        <p className="text-blue-600 font-medium text-lg">Drop files here!</p>
                        <p className="text-blue-500">Release to upload</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium mb-2">Drag & drop files here</p>
                        <p className="text-gray-500 mb-2">or click to browse</p>
                        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                          <span className="px-2 py-1 bg-gray-100 rounded">Images</span>
                          <span className="px-2 py-1 bg-gray-100 rounded">Documents</span>
                          <span className="px-2 py-1 bg-gray-100 rounded">Videos</span>
                          <span className="px-2 py-1 bg-gray-100 rounded">Max: 100MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Upload Progress */}
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Uploading file...</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Modern Search and Filter */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400 bg-white"
                  >
                    <option value="all">🗂️ All Files</option>
                    <option value="image">🖼️ Images</option>
                    <option value="video">🎥 Videos</option>
                    <option value="audio">🎵 Audio</option>
                    <option value="application">📄 Documents</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Files Grid */}
            <div className="space-y-4">
              {filteredFiles.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <File className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
                    <p className="text-gray-500">Upload your first file to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm group hover:scale-105">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                              {getFileIcon(file.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-sm block truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => shareFile(file)}
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                            >
                              <Share2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => downloadFile(file)}
                              className="h-8 w-8 p-0 hover:bg-green-100"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteFile(file.id)}
                              className="h-8 w-8 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between">
                            <span>Uploaded by:</span>
                            <span className="font-medium">{file.uploadedBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Downloads:</span>
                            <span className="font-medium text-blue-600">{file.downloadCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span>{file.uploadedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {file.isShared && (
                          <Badge variant="secondary" className="mt-3 bg-green-100 text-green-700 border-green-200">
                            <Share2 className="w-3 h-3 mr-1" />
                            Shared
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          {/* Whiteboard */}
          {showWhiteboard && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Collaborative Whiteboard</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearWhiteboard}>
                      Clear
                    </Button>
                    <Button variant="outline" onClick={() => setShowWhiteboard(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="border rounded-lg cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </CardContent>
            </Card>
          )}
        </div>

          {/* Modern Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Users Panel */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  Online ({users.length + 1})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Current User */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                        {currentUser.name[0]}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{currentUser.name}</p>
                      <p className="text-xs text-blue-600 font-medium">Admin</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">You</Badge>
                </div>

                {/* Other Users */}
                {users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No other users online</p>
                    <p className="text-xs mt-1">Share the room link to invite others!</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-medium">
                            {user.name[0]}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => muteUser(user.id)}
                          className="h-8 w-8 p-0 hover:bg-yellow-100"
                          title={user.isMuted ? "Unmute user" : "Mute user"}
                        >
                          {user.isMuted ? 
                            <MicOff className="w-4 h-4 text-red-500" /> : 
                            <Mic className="w-4 h-4 text-green-500" />
                          }
                        </Button>
                        {currentUser.role === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUser(user.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100"
                            title="Remove user"
                          >
                            <UserX className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* AI Assistant */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Ask me anything about your files..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && askAI()}
                    className="rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                  <Button 
                    onClick={askAI} 
                    disabled={isAiLoading || !aiInput.trim()}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  >
                    {isAiLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Thinking...
                      </div>
                    ) : (
                      'Ask AI'
                    )}
                  </Button>
                </div>
                
                {aiResponse && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                    <div className="flex items-start gap-2">
                      <Bot className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 leading-relaxed">{aiResponse}</p>
                    </div>
                  </div>
                )}
                
                {!aiResponse && (
                  <div className="text-center py-4 text-gray-500">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Ask me about your files!</p>
                    <p className="text-xs mt-1">I can help analyze, summarize, or answer questions</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Panel */}
            {showChat && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      Chat
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowChat(false)}
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-64 overflow-y-auto space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      chatMessages.map((message) => (
                        <div key={message.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-blue-600">{message.userName}</span>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-sm text-gray-700">{message.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!chatInput.trim()}
                      className="rounded-xl px-6 bg-blue-500 hover:bg-blue-600"
                    >
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Enhanced Whiteboard */}
        {showWhiteboard && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  Collaborative Whiteboard
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={clearWhiteboard}
                    className="rounded-xl"
                  >
                    Clear
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowWhiteboard(false)}
                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={isMobile ? 350 : 800}
                  height={isMobile ? 250 : 400}
                  className="cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">Click and drag to draw • Changes are shared in real-time</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}