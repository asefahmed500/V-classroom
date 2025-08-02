"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Eye,
  Share2,
  Clock
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface SharedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedAt: number
  downloadCount: number
}

interface FileUploadProgress {
  id: string
  name: string
  progress: number
  status: "uploading" | "completed" | "error"
}

interface FileSharingProps {
  roomId: string
  userId: string
}

export function FileSharing({ roomId, userId }: FileSharingProps) {
  const [files, setFiles] = useState<SharedFile[]>([])
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUser, setCurrentUser] = useState({ id: "", name: "" })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchRoomFiles()
    initializeSocket()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const user = await response.json()
        setCurrentUser({ id: user._id, name: user.name })
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error)
      setCurrentUser({ id: `user_${Date.now()}`, name: "Student" })
    }
  }

  const fetchRoomFiles = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/files`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error("Failed to fetch room files:", error)
    }
  }

  const initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      socketInstance.emit("join-room", roomId, userId)
    })

    socketInstance.on("file-shared", (fileData: SharedFile) => {
      setFiles((prev) => [fileData, ...prev])
    })

    return () => {
      socketInstance.disconnect()
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (fileList: File[]) => {
    for (const file of fileList) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB")
      return
    }

    const uploadId = Date.now().toString()
    
    // Add to upload progress
    setUploadProgress((prev) => [
      ...prev,
      { id: uploadId, name: file.name, progress: 0, status: "uploading" }
    ])

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("roomId", roomId)
      formData.append("uploadedBy", currentUser.id)

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, progress } : item
            )
          )
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          const newFile: SharedFile = {
            id: response.fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            url: response.fileUrl,
            uploadedBy: currentUser.name,
            uploadedAt: Date.now(),
            downloadCount: 0,
          }

          // Add to files list
          setFiles((prev) => [newFile, ...prev])

          // Notify other users via socket
          if (socket) {
            socket.emit("file-shared", roomId, newFile)
          }

          // Update progress
          setUploadProgress((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, status: "completed" } : item
            )
          )

          // Remove from progress after delay
          setTimeout(() => {
            setUploadProgress((prev) => prev.filter((item) => item.id !== uploadId))
          }, 2000)
        } else {
          throw new Error("Upload failed")
        }
      })

      xhr.addEventListener("error", () => {
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, status: "error" } : item
          )
        )
      })

      xhr.open("POST", "/api/upload")
      xhr.send(formData)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadProgress((prev) =>
        prev.map((item) =>
          item.id === uploadId ? { ...item, status: "error" } : item
        )
      )
    }
  }

  const downloadFile = async (file: SharedFile) => {
    try {
      // Track download
      await fetch(`/api/rooms/${roomId}/files/${file.id}/download`, {
        method: "POST",
      })

      // Update download count
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, downloadCount: f.downloadCount + 1 } : f
        )
      )

      // Trigger download
      const link = document.createElement("a")
      link.href = file.url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const response = await fetch(`/api/rooms/${roomId}/files/${fileId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-5 h-5" />
    if (type.includes("pdf")) return <FileText className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          accept="*/*"
        />
        <p className="text-xs text-gray-500 mt-2">
          Maximum file size: 50MB
        </p>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Uploading...</h4>
          <div className="space-y-3">
            {uploadProgress.map((upload) => (
              <div key={upload.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{upload.name}</span>
                  <Badge
                    variant={
                      upload.status === "completed"
                        ? "default"
                        : upload.status === "error"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {upload.status}
                  </Badge>
                </div>
                <Progress value={upload.progress} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Shared Files ({files.length})</h4>
          <Button variant="outline" size="sm" onClick={fetchRoomFiles}>
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-full">
          {files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No files shared yet</p>
              <p className="text-sm">Upload files to share with your study group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-blue-600 mt-1">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium truncate">{file.name}</h5>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>{formatFileSize(file.size)}</span>
                            <span>by {file.uploadedBy}</span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(file.uploadedAt)}
                            </span>
                            <span>{file.downloadCount} downloads</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {file.type.startsWith("image/") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(file.url)
                            alert("File link copied to clipboard!")
                          }}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        {file.uploadedBy === currentUser.name && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFile(file.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}