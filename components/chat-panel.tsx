"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, File, Image, MessageCircle } from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
  type: "text" | "system" | "file" | "image"
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

interface ChatPanelProps {
  roomId: string
}

export function ChatPanel({ roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUser, setCurrentUser] = useState({ id: "", name: "" })
  const [isConnected, setIsConnected] = useState(false)
  const [typing, setTyping] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Get current user from auth
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (!currentUser.id) return

    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/socket.io/",
      transports: ["polling", "websocket"],
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      console.log("Connected to chat server")
      setIsConnected(true)
      socketInstance.emit("join-room", roomId, currentUser.id, currentUser.name)
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from chat server")
      setIsConnected(false)
    })

    // Listen for messages
    socketInstance.on("chat-message", (message: Message) => {
      setMessages((prev) => [...prev, message])
      
      // Show notification for new messages when page is not visible
      if (document.hidden && message.userId !== currentUser.id) {
        new Notification(`New message from ${message.userName}`, {
          body: message.content.substring(0, 100),
          icon: "/favicon.ico",
          tag: "new-message"
        })
      }
    })

    // System messages
    socketInstance.on("user-connected", (userId: string) => {
      const systemMessage: Message = {
        id: Date.now().toString(),
        userId: "system",
        userName: "System",
        content: `User joined the room`,
        timestamp: Date.now(),
        type: "system",
      }
      setMessages((prev) => [...prev, systemMessage])
    })

    socketInstance.on("user-disconnected", (userId: string) => {
      const systemMessage: Message = {
        id: Date.now().toString(),
        userId: "system",
        userName: "System",
        content: `User left the room`,
        timestamp: Date.now(),
        type: "system",
      }
      setMessages((prev) => [...prev, systemMessage])
    })

    // Typing indicators
    socketInstance.on("user-typing", (userId: string, userName: string) => {
      if (userId !== currentUser.id) {
        setTyping((prev) => [...prev.filter(id => id !== userId), userId])
        setTimeout(() => {
          setTyping((prev) => prev.filter(id => id !== userId))
        }, 3000)
      }
    })

    socketInstance.on("user-stopped-typing", (userId: string) => {
      setTyping((prev) => prev.filter(id => id !== userId))
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [roomId, currentUser.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const user = await response.json()
        setCurrentUser({ id: user._id, name: user.name })
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error)
      // Fallback for demo
      setCurrentUser({ id: `user_${Date.now()}`, name: "Student" })
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) return

    const message: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: newMessage.trim(),
      timestamp: Date.now(),
      type: "text",
    }

    socket.emit("chat-message", roomId, message)
    setMessages((prev) => [...prev, message])
    setNewMessage("")
    
    // Stop typing indicator
    socket.emit("user-stopped-typing", roomId, currentUser.id)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (socket && isConnected && value.trim()) {
      socket.emit("user-typing", roomId, currentUser.id, currentUser.name)
    } else if (socket && isConnected) {
      socket.emit("user-stopped-typing", roomId, currentUser.id)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !socket || !isConnected) return

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB")
      return
    }

    try {
      // Upload file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("roomId", roomId)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const { fileUrl, fileName } = await response.json()
        
        const message: Message = {
          id: Date.now().toString(),
          userId: currentUser.id,
          userName: currentUser.name,
          content: `Shared a file: ${fileName}`,
          timestamp: Date.now(),
          type: file.type.startsWith("image/") ? "image" : "file",
          fileUrl,
          fileName,
          fileSize: file.size,
        }

        socket.emit("chat-message", roomId, message)
        setMessages((prev) => [...prev, message])
      } else {
        alert("Failed to upload file")
      }
    } catch (error) {
      console.error("File upload error:", error)
      alert("Failed to upload file")
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </h3>
          <div className={`text-xs ${isConnected ? "text-green-400" : "text-red-400"}`}>
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex flex-col ${message.type === "system" ? "items-center" : ""}`}>
              {message.type === "system" ? (
                <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {message.content}
                </div>
              ) : (
                <div className={`max-w-xs ${message.userId === currentUser.id ? "ml-auto" : ""}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-gray-400">{message.userName}</span>
                    <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.userId === currentUser.id
                        ? "bg-blue-600 text-white ml-auto"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {message.type === "image" && message.fileUrl ? (
                      <div>
                        <img 
                          src={message.fileUrl} 
                          alt={message.fileName}
                          className="max-w-full h-auto rounded mb-2"
                          style={{ maxHeight: "200px" }}
                        />
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ) : message.type === "file" && message.fileUrl ? (
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4" />
                        <div>
                          <a 
                            href={message.fileUrl} 
                            download={message.fileName}
                            className="text-blue-300 hover:text-blue-100 underline"
                          >
                            {message.fileName}
                          </a>
                          {message.fileSize && (
                            <p className="text-xs text-gray-300">{formatFileSize(message.fileSize)}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicators */}
          {typing.length > 0 && (
            <div className="text-xs text-gray-400 italic">
              {typing.length === 1 ? "Someone is typing..." : `${typing.length} people are typing...`}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 hover:bg-gray-600"
          >
            <File className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            maxLength={1000}
            disabled={!isConnected}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || !isConnected} 
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}