"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, Download, Trash2, Eye, Share2, Search, Filter,
  FileText, Image, Video, Music, Archive, File, Folder,
  Grid, List, MoreVertical, Star, StarOff, Copy, Link,
  Users, Clock, CheckCircle, AlertCircle, X, Plus
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Socket } from 'socket.io-client'
import { toast } from 'sonner'

interface FileData {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedByName: string
  uploadedAt: number
  downloads: number
  isShared: boolean
  isFavorite: boolean
  tags: string[]
  thumbnail?: string
  description?: string
}

interface EnhancedFileSharingProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
  isHost: boolean
}

export function EnhancedFileSharingV2({ 
  socket, 
  roomId, 
  userId, 
  userName, 
  isHost 
}: EnhancedFileSharingProps) {
  const [files, setFiles] = useState<FileData[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'downloads'>('date')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [draggedFiles, setDraggedFiles] = useState<File[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('file-shared', (fileData: FileData) => {
      setFiles(prev => [...prev, fileData])
      toast.success(`${fileData.uploadedByName} shared a file: ${fileData.name}`)
    })

    socket.on('file-deleted', ({ fileId, deletedBy }) => {
      setFiles(prev => prev.filter(f => f.id !== fileId))
      if (deletedBy !== userName) {
        toast.info(`A file was removed from the room`)
      }
    })

    socket.on('file-favorited', ({ fileId, userId: favUserId, isFavorite }) => {
      if (favUserId === userId) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, isFavorite } : f
        ))
      }
    })

    return () => {
      socket.off('file-shared')
      socket.off('file-deleted')
      socket.off('file-favorited')
    }
  }, [socket, userId, userName])

  // Load existing files
  useEffect(() => {
    loadFiles()
  }, [roomId])

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/files/room/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setDraggedFiles(acceptedFiles)
    setShowUploadModal(true)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  })

  const uploadFiles = async (filesToUpload: File[], descriptions: string[] = []) => {
    const uploadPromises = filesToUpload.map(async (file, index) => {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Initialize progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('roomId', roomId)
      formData.append('uploadedBy', userId)
      formData.append('uploadedByName', userName)
      formData.append('description', descriptions[index] || '')

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[fileId] || 0
            const newProgress = Math.min(currentProgress + Math.random() * 30, 95)
            
            if (newProgress >= 95) {
              clearInterval(progressInterval)
              return { ...prev, [fileId]: 100 }
            }
            
            return { ...prev, [fileId]: newProgress }
          })
        }, 200)

        // Complete upload
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
          
          const fileData: FileData = {
            id: result.fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            url: result.url,
            uploadedBy: userId,
            uploadedByName: userName,
            uploadedAt: Date.now(),
            downloads: 0,
            isShared: true,
            isFavorite: false,
            tags: [],
            description: descriptions[index] || '',
            thumbnail: result.thumbnail
          }

          setFiles(prev => [...prev, fileData])
          
          // Notify other users
          socket?.emit('file-shared', {
            roomId,
            fileData
          })

          // Clean up progress
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[fileId]
              return newProgress
            })
          }, 2000)
          
          clearInterval(progressInterval)
        }, 1000)

        return result
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })
        toast.error(`Failed to upload ${file.name}`)
        throw error
      }
    })

    try {
      await Promise.all(uploadPromises)
      toast.success(`Successfully uploaded ${filesToUpload.length} file(s)`)
      setShowUploadModal(false)
      setDraggedFiles([])
    } catch (error) {
      console.error('Some uploads failed:', error)
    }
  }

  const deleteFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    // Check permissions
    if (file.uploadedBy !== userId && !isHost) {
      toast.error('You can only delete your own files')
      return
    }

    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId })
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
        
        // Notify other users
        socket?.emit('file-deleted', {
          roomId,
          fileId,
          deletedBy: userName
        })
        
        toast.success('File deleted successfully')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
      toast.error('Failed to delete file')
    }
  }

  const downloadFile = async (file: FileData) => {
    try {
      // Track download
      await fetch(`/api/files/${file.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId })
      })

      // Update local state
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, downloads: f.downloads + 1 } : f
      ))

      // Trigger download
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      link.click()
      
      toast.success(`Downloading ${file.name}`)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download file')
    }
  }

  const toggleFavorite = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const newFavoriteStatus = !file.isFavorite

    try {
      const response = await fetch(`/api/files/${fileId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          roomId, 
          isFavorite: newFavoriteStatus 
        })
      })

      if (response.ok) {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, isFavorite: newFavoriteStatus } : f
        ))

        socket?.emit('file-favorited', {
          roomId,
          fileId,
          userId,
          isFavorite: newFavoriteStatus
        })
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const copyFileLink = (file: FileData) => {
    const link = `${window.location.origin}/files/${file.id}`
    navigator.clipboard.writeText(link)
    toast.success('File link copied to clipboard')
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />
    if (type.includes('pdf')) return <FileText className="w-5 h-5" />
    if (type.includes('zip') || type.includes('rar')) return <Archive className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter and sort files
  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           file.uploadedByName.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'images' && file.type.startsWith('image/')) ||
                           (filterType === 'videos' && file.type.startsWith('video/')) ||
                           (filterType === 'documents' && (file.type.includes('pdf') || file.type.includes('doc') || file.type.includes('text'))) ||
                           (filterType === 'favorites' && file.isFavorite) ||
                           (filterType === 'mine' && file.uploadedBy === userId)
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'downloads':
          return b.downloads - a.downloads
        case 'date':
        default:
          return b.uploadedAt - a.uploadedAt
      }
    })

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Folder className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Shared Files</h2>
            <Badge variant="outline">{files.length} files</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              variant="outline"
              size="sm"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="pl-10"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Files</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="documents">Documents</option>
            <option value="favorites">Favorites</option>
            <option value="mine">My Files</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="downloads">Sort by Downloads</option>
          </select>
        </div>
      </div>

      {/* File upload area */}
      <div
        {...getRootProps()}
        className={`m-4 p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-600">
          or <button className="text-blue-600 hover:underline">browse files</button>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Supports images, videos, documents, and more (max 100MB per file)
        </p>
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mx-4 mb-4 space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="bg-white p-3 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Files grid/list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload some files to get started'
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2'
          }>
            {filteredFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {viewMode === 'grid' ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.type)}
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </span>
                        </div>
                        <Button
                          onClick={() => toggleFavorite(file.id)}
                          variant="ghost"
                          size="sm"
                          className="p-1"
                        >
                          {file.isFavorite ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-3">
                        <div>By {file.uploadedByName}</div>
                        <div>{formatDate(file.uploadedAt)}</div>
                        <div>{formatFileSize(file.size)}</div>
                        <div>{file.downloads} downloads</div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={() => downloadFile(file)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                        
                        <Button
                          onClick={() => copyFileLink(file)}
                          size="sm"
                          variant="outline"
                        >
                          <Link className="w-3 h-3" />
                        </Button>
                        
                        {(file.uploadedBy === userId || isHost) && (
                          <Button
                            onClick={() => deleteFile(file.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <div className="font-medium text-gray-900">{file.name}</div>
                          <div className="text-sm text-gray-600">
                            {formatFileSize(file.size)} • By {file.uploadedByName} • {formatDate(file.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{file.downloads} downloads</Badge>
                        
                        <Button
                          onClick={() => toggleFavorite(file.id)}
                          variant="ghost"
                          size="sm"
                        >
                          {file.isFavorite ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => downloadFile(file)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          onClick={() => copyFileLink(file)}
                          size="sm"
                          variant="outline"
                        >
                          <Link className="w-4 h-4" />
                        </Button>
                        
                        {(file.uploadedBy === userId || isHost) && (
                          <Button
                            onClick={() => deleteFile(file.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            const filesArray = Array.from(e.target.files)
            setDraggedFiles(filesArray)
            setShowUploadModal(true)
          }
        }}
      />

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Files</CardTitle>
                <Button
                  onClick={() => {
                    setShowUploadModal(false)
                    setDraggedFiles([])
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Ready to upload {draggedFiles.length} file(s)
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {draggedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.type)}
                        <span className="text-sm font-medium truncate">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => uploadFiles(draggedFiles)}
                    className="flex-1"
                  >
                    Upload All
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUploadModal(false)
                      setDraggedFiles([])
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}