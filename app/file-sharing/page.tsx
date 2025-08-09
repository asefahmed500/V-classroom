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
  Share2,
  Search,
  X,
  Users,
  Mic,
  MicOff,
  UserX,
  MessageSquare,
  Bot,
  Send,
  Grid,
  List,
  Star,
  User,
  Palette,
  Save
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { toast, Toaster } from 'sonner'

interface FileData {
  id: string
  name: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: Date
  downloadCount: number
  isShared: boolean
  isFavorite: boolean
  tags: string[]
}

interface User {
  id: string
  name: string
  isMuted: boolean
  isOnline: boolean
  role: 'admin' | 'member'
  color: string
}

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: 'text' | 'file' | 'system'
  userColor: string
}

export default function FileSharing() { 
 // State management
  const [files, setFiles] = useState<FileData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'downloads'>('date')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  
  // Panel states
  const [showChat, setShowChat] = useState(false)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [showUsers, setShowUsers] = useState(true)
  const [showAI, setShowAI] = useState(false)
  
  // Input states
  const [chatInput, setChatInput] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false)
  
  // Current user
  const [currentUser] = useState<User>({
    id: 'current-user',
    name: 'You',
    isMuted: false,
    isOnline: true,
    role: 'admin',
    color: '#3B82F6'
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

  // Add demo users and files
  useEffect(() => {
    const demoUsers: User[] = [
      {
        id: 'user-1',
        name: 'Alice Johnson',
        isMuted: false,
        isOnline: true,
        role: 'member',
        color: '#10B981'
      },
      {
        id: 'user-2',
        name: 'Bob Smith',
        isMuted: true,
        isOnline: true,
        role: 'member',
        color: '#F59E0B'
      },
      {
        id: 'user-3',
        name: 'Carol Davis',
        isMuted: false,
        isOnline: false,
        role: 'member',
        color: '#EF4444'
      }
    ]
    
    setTimeout(() => {
      setUsers(demoUsers)
    }, 1000)

    // Add some demo files
    const demoFiles: FileData[] = [
      {
        id: 'demo-1',
        name: 'Project Presentation.pptx',
        size: 2048000,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        uploadedBy: 'Alice Johnson',
        uploadedAt: new Date(Date.now() - 3600000),
        downloadCount: 5,
        isShared: true,
        isFavorite: true,
        tags: ['presentation', 'project']
      },
      {
        id: 'demo-2',
        name: 'Study Notes.pdf',
        size: 1024000,
        type: 'application/pdf',
        uploadedBy: 'You',
        uploadedAt: new Date(Date.now() - 7200000),
        downloadCount: 2,
        isShared: true,
        isFavorite: false,
        tags: ['notes', 'study']
      },
      {
        id: 'demo-3',
        name: 'Research Paper.docx',
        size: 512000,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'Bob Smith',
        uploadedAt: new Date(Date.now() - 10800000),
        downloadCount: 8,
        isShared: true,
        isFavorite: true,
        tags: ['research', 'academic']
      }
    ]
    
    setTimeout(() => {
      setFiles(demoFiles)
    }, 2000)
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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
        isShared: true,
        isFavorite: false,
        tags: []
      }

      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const progress = prev[fileId] + Math.random() * 15 + 5
          if (progress >= 100) {
            clearInterval(interval)
            setFiles(prevFiles => [...prevFiles, newFile])
            setTimeout(() => {
              setUploadProgress(prev => {
                const { [fileId]: _, ...rest } = prev
                return rest
              })
            }, 1000)
            toast.success(`${file.name} uploaded successfully!`)
            return { ...prev, [fileId]: 100 }
          }
          return { ...prev, [fileId]: Math.min(progress, 100) }
        })
      }, 300)

      toast.info(`Uploading ${file.name}...`)
    })
  }, [currentUser.name])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  })

  // File operations
  const downloadFile = (file: FileData) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, downloadCount: f.downloadCount + 1 } : f
    ))
    toast.success(`Downloaded ${file.name}`)
  }

  const deleteFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setSelectedFiles(prev => prev.filter(id => id !== fileId))
    toast.success(`${file?.name} deleted`)
  }

  const shareFile = (file: FileData) => {
    const shareUrl = `${window.location.origin}/files/${file.id}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('File link copied to clipboard!')
  }

  const toggleFavorite = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f
    ))
    const file = files.find(f => f.id === fileId)
    toast.success(file?.isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }

  const selectFile = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const clearSelection = () => {
    setSelectedFiles([])
  }

  const deleteSelectedFiles = () => {
    if (selectedFiles.length === 0) return
    setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)))
    toast.success(`${selectedFiles.length} files deleted`)
    setSelectedFiles([])
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
    const user = users.find(u => u.id === userId)
    setUsers(prev => prev.filter(user => user.id !== userId))
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
      type: 'text',
      userColor: currentUser.color
    }
    
    setChatMessages(prev => [...prev, message])
    setChatInput('')
  }

  // AI Assistant - Simplified without API calls
  const askAI = async () => {
    if (!aiInput.trim()) return
    
    setIsAiLoading(true)
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: `user-ai-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        message: `🤖 ${aiInput}`,
        timestamp: new Date(),
        type: 'text',
        userColor: currentUser.color
      }
      setChatMessages(prev => [...prev, userMessage])

      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const responses = [
        "I can help you analyze your files! What specific information are you looking for?",
        "Based on your uploaded files, I notice you have presentation and study materials. Would you like me to summarize them?",
        "I can help organize your files by type, date, or topic. What would be most useful?",
        "Your files look well-organized! Is there anything specific you'd like me to help you with?",
        "I see you have both PDF and presentation files. Would you like me to extract key information from them?",
        "Great question! I can help you understand complex topics by breaking them down into simpler concepts.",
        "I'm here to assist with your studies. What subject are you working on today?",
        "That's an interesting topic! Let me provide some insights that might help you."
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setAiResponse(randomResponse)
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        userId: 'ai-assistant',
        userName: 'AI Assistant',
        message: randomResponse,
        timestamp: new Date(),
        type: 'text',
        userColor: '#8B5CF6'
      }
      setChatMessages(prev => [...prev, aiMessage])
      
    } catch (error) {
      toast.error('Failed to get AI response')
    } finally {
      setIsAiLoading(false)
      setAiInput('')
    }
  }

  // Filter and sort files
  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesFilter = filterType === 'all' || file.type.startsWith(filterType)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date':
          return b.uploadedAt.getTime() - a.uploadedAt.getTime()
        case 'size':
          return b.size - a.size
        case 'downloads':
          return b.downloadCount - a.downloadCount
        default:
          return 0
      }
    })

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-green-500" />
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-5 h-5 text-orange-500" />
    if (type.includes('zip') || type.includes('archive')) return <Archive className="w-5 h-5 text-purple-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Smart File Collaboration
              </h1>
              <p className="text-gray-600 mt-1">Share, organize, and collaborate on files in real-time</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showUsers ? "default" : "outline"}
                onClick={() => setShowUsers(!showUsers)}
                className="rounded-full"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Users ({users.length + 1})
              </Button>
              <Button
                variant={showChat ? "default" : "outline"}
                onClick={() => setShowChat(!showChat)}
                className="rounded-full"
                size="sm"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={showAI ? "default" : "outline"}
                onClick={() => setShowAI(!showAI)}
                className="rounded-full"
                size="sm"
              >
                <Bot className="w-4 h-4 mr-2" />
                AI
              </Button>
              <Button
                variant={showWhiteboard ? "default" : "outline"}
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="rounded-full"
                size="sm"
              >
                <Palette className="w-4 h-4 mr-2" />
                Board
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload Area */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDragActive ? 'bg-blue-100 scale-110' : 'bg-gray-100'
                    }`}>
                      <Upload className={`w-10 h-10 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    {isDragActive ? (
                      <div>
                        <p className="text-blue-600 font-semibold text-xl">Drop files here!</p>
                        <p className="text-blue-500">Release to upload</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xl font-semibold mb-2">Drag & drop files here</p>
                        <p className="text-gray-500 mb-4">or click to browse your computer</p>
                        <div className="flex flex-wrap justify-center gap-2 text-sm">
                          <Badge variant="secondary">Images</Badge>
                          <Badge variant="secondary">Documents</Badge>
                          <Badge variant="secondary">Videos</Badge>
                          <Badge variant="secondary">Audio</Badge>
                          <Badge variant="secondary">Max: 100MB</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">Uploading file...</span>
                      </div>
                      <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-3" />
                  </div>
                ))}
              </CardContent>
            </Card> 
           {/* Search and Controls */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search files and tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 h-12"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400 bg-white min-w-[120px]"
                    >
                      <option value="all">All Files</option>
                      <option value="image">Images</option>
                      <option value="video">Videos</option>
                      <option value="audio">Audio</option>
                      <option value="application">Documents</option>
                    </select>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-blue-400 bg-white min-w-[120px]"
                    >
                      <option value="date">Sort by Date</option>
                      <option value="name">Sort by Name</option>
                      <option value="size">Sort by Size</option>
                      <option value="downloads">Sort by Downloads</option>
                    </select>
                    
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      onClick={() => setViewMode('grid')}
                      className="rounded-xl"
                      size="lg"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      onClick={() => setViewMode('list')}
                      className="rounded-xl"
                      size="lg"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Selection Controls */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-700">
                        {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearSelection}>
                          Clear
                        </Button>
                        <Button variant="destructive" size="sm" onClick={deleteSelectedFiles}>
                          Delete Selected
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>        
    {/* Files Display */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardContent className="pt-6">
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <File className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No files found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm ? 'Try adjusting your search terms' : 'Upload your first file to get started!'}
                    </p>
                    {searchTerm && (
                      <Button variant="outline" onClick={() => setSearchTerm('')}>
                        Clear Search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }>
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`group relative bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 ${
                          selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''
                        } ${viewMode === 'list' ? 'flex items-center p-4' : 'p-6'}`}
                      >
                        {/* Selection Checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={() => selectFile(file.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>

                        {/* Favorite Star */}
                        <button
                          onClick={() => toggleFavorite(file.id)}
                          className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <Star className={`w-4 h-4 ${file.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                        </button>

                        <div className={`flex ${viewMode === 'list' ? 'items-center gap-4 flex-1' : 'flex-col'}`}>
                          {/* File Icon and Info */}
                          <div className={`flex items-center gap-3 ${viewMode === 'list' ? 'flex-1' : 'mb-4'}`}>
                            <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                              {getFileIcon(file.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 truncate" title={file.name}>
                                {file.name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <span>{formatFileSize(file.size)}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(file.uploadedAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* File Stats */}
                          {viewMode === 'grid' && (
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span className="truncate">{file.uploadedBy}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                <span>{file.downloadCount} downloads</span>
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {file.tags.length > 0 && (
                            <div className={`flex flex-wrap gap-1 ${viewMode === 'list' ? 'flex-1' : 'mb-4'}`}>
                              {file.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className={`flex gap-2 ${viewMode === 'list' ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => shareFile(file)}
                              className="rounded-full"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(file)}
                              className="rounded-full"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteFile(file.id)}
                              className="rounded-full hover:bg-red-50 hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
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
            {/* Users Panel */}
            {showUsers && (
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    Online Users ({users.filter(u => u.isOnline).length + 1})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Current User */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: currentUser.color }}
                        >
                          {currentUser.name[0]}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{currentUser.name}</p>
                        <p className="text-xs text-blue-600 font-medium">{currentUser.role}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">You</Badge>
                  </div>

                  {/* Other Users */}
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name[0]}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{user.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            {!user.isOnline && <span className="text-xs text-gray-400">• Offline</span>}
                          </div>
                        </div>
                      </div>
                      
                      {user.isOnline && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => muteUser(user.id)}
                            className="h-8 w-8 p-0 hover:bg-yellow-100 rounded-full"
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
                              className="h-8 w-8 p-0 hover:bg-red-100 rounded-full"
                              title="Remove user"
                            >
                              <UserX className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}          
  {/* AI Assistant */}
            {showAI && (
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Input
                      placeholder="Ask me about your files..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && askAI()}
                      className="rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                    <Button 
                      onClick={askAI} 
                      disabled={isAiLoading || !aiInput.trim()}
                      className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {isAiLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Thinking...
                        </div>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Ask AI
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {aiResponse && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                      <div className="flex items-start gap-3">
                        <Bot className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 leading-relaxed">{aiResponse}</p>
                      </div>
                    </div>
                  )}
                  
                  {!aiResponse && (
                    <div className="text-center py-6 text-gray-500">
                      <Bot className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">AI Assistant Ready</p>
                      <p className="text-sm mt-1">Ask me anything about your files!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chat Panel */}
            {showChat && (
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
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
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      chatMessages.map((message) => (
                        <div key={message.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                              style={{ backgroundColor: message.userColor }}
                            >
                              {message.userName[0]}
                            </div>
                            <span className="font-semibold text-sm" style={{ color: message.userColor }}>
                              {message.userName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="ml-8 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-sm text-gray-700">{message.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
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
                      className="rounded-xl px-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Whiteboard Modal */}
        {showWhiteboard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-6xl max-h-[90vh] bg-white shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    Collaborative Whiteboard
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" className="rounded-xl">
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
              <CardContent className="space-y-4">
                {/* Canvas Placeholder */}
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white h-96 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Palette className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">Whiteboard Ready</p>
                    <p className="text-sm mt-1">Start drawing to collaborate!</p>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-500">
                  <p>Click and drag to draw • Changes are shared in real-time with all participants</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </div>
  )
}