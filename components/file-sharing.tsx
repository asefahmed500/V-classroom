"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, Download, FileText, Image, Video, 
  Music, Archive, File, Trash2, Eye, Share2,
  Clock, User, Search, Filter, MoreVertical
} from "lucide-react"
import { toast } from "sonner"
import { Socket } from "socket.io-client"

interface SharedFile {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  uploadedBy: string
  uploaderName: string
  uploadedAt: Date
  downloadCount: number
}

interface FileUpload {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
}

interface FileSharingProps {
  roomId: string
  userId: string
  userName: string
  socket: Socket | null
}

export function FileSharing({
  roomId,
  userId,
  userName,
  socket
}: FileSharingProps) {
  const [files, setFiles] = useState<SharedFile[]>([])
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'videos' | 'audio'>('all')
  const [dragOver, setDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadFiles()
    
    if (socket) {
      socket.on("file-shared", handleFileShared)
      socket.on("file-deleted", handleFileDeleted)
      
      return () => {
        socket.off("file-shared", handleFileShared)
        socket.off("file-deleted", handleFileDeleted)
      }
    }
  }, [socket])

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/video-calls/${roomId}/files`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files.map((file: any) => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt)
        })))
      }
    } catch (error) {
      console.error("Error loading files:", error)
    }
  }

  const handleFileShared = (fileData: any) => {
    setFiles(prev => [...prev, {
      ...fileData,
      uploadedAt: new Date(fileData.uploadedAt)
    }])
    toast.success(`${fileData.uploaderName} shared a file: ${fileData.fileName}`)
  }

  const handleFileDeleted = ({ fileId }: { fileId: string }) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    toast.info("File was removed from the room")
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    selectedFiles.forEach(uploadFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.forEach(uploadFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const uploadFile = async (file: File) => {
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large (max 100MB)")
      return
    }

    const uploadId = Date.now().toString()
    const newUpload: FileUpload = {
      id: uploadId,
      file,
      progress: 0,
      status: 'uploading'
    }

    setUploads(prev => [...prev, newUpload])

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress }
              : upload
          ))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'completed', progress: 100 }
              : upload
          ))

          // Emit to socket for real-time sharing
          socket?.emit("file-shared", {
            roomId,
            fileData: response.file
          })

          // Remove upload from list after 2 seconds
          setTimeout(() => {
            setUploads(prev => prev.filter(upload => upload.id !== uploadId))
          }, 2000)

          toast.success("File uploaded successfully")
        } else {
          throw new Error("Upload failed")
        }
      })

      xhr.addEventListener('error', () => {
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: 'error' }
            : upload
        ))
        toast.error("Failed to upload file")
      })

      xhr.open('POST', `/api/video-calls/${roomId}/files`)
      xhr.send(formData)

    } catch (error) {
      console.error("Error uploading file:", error)
      setUploads(prev => prev.map(upload => 
        upload.id === uploadId 
          ? { ...upload, status: 'error' }
          : upload
      ))
      toast.error("Failed to upload file")
    }
  }

  const downloadFile = async (file: SharedFile) => {
    try {
      const response = await fetch(file.fileUrl)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success("File downloaded")
    } catch (error) {
      console.error("Error downloading file:", error)
      toast.error("Failed to download file")
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to remove this file?")) return

    try {
      const response = await fetch(`/api/video-calls/${roomId}/files/${fileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        socket?.emit("file-deleted", { roomId, fileId })
        toast.success("File removed")
      } else {
        toast.error("Failed to remove file")
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Failed to remove file")
    }
  }

  const shareFile = (file: SharedFile) => {
    const shareUrl = `${window.location.origin}${file.fileUrl}`
    navigator.clipboard.writeText(shareUrl)
    toast.success("File link copied to clipboard")
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-green-500" />
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-500" />
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-5 h-5 text-yellow-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploaderName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'images' && file.fileType.startsWith('image/')) ||
      (filterType === 'documents' && (file.fileType.includes('pdf') || file.fileType.includes('document') || file.fileType.includes('text'))) ||
      (filterType === 'videos' && file.fileType.startsWith('video/')) ||
      (filterType === 'audio' && file.fileType.startsWith('audio/'))
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Shared Files ({files.length})</h3>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
        
        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex space-x-2">
            {(['all', 'images', 'documents', 'videos', 'audio'] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className="text-xs"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="p-4 border-b border-gray-700 space-y-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white truncate">{upload.file.name}</span>
                <span className="text-gray-400">{upload.progress}%</span>
              </div>
              <Progress 
                value={upload.progress} 
                className={`h-2 ${
                  upload.status === 'error' ? 'bg-red-600' : 
                  upload.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 relative ${dragOver ? 'bg-blue-600/20 border-blue-500' : ''}`}
      >
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-600/20 border-2 border-dashed border-blue-500 z-10">
            <div className="text-center text-white">
              <Upload className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-semibold">Drop files here to upload</p>
            </div>
          </div>
        )}

        {/* Files List */}
        <ScrollArea className="h-full">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">No files shared yet</p>
              <p className="text-sm">Upload files to share with participants</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredFiles.map((file) => (
                <div key={file.id} className="group flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(file.fileType)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium truncate">
                          {file.fileName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(file.fileSize)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        <span>{file.uploaderName}</span>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadFile(file)}
                      className="p-2"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => shareFile(file)}
                      className="p-2"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    
                    {file.uploadedBy === userId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteFile(file.id)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
        accept="*/*"
      />
    </div>
  )
}