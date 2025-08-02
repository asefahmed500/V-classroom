"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Send, 
  Smile, 
  Paperclip, 
  Image, 
  File,
  MoreVertical,
  Reply,
  Heart,
  ThumbsUp,
  Laugh
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: string
  type: "text" | "file" | "image" | "system"
  fileUrl?: string
  fileName?: string
  reactions?: { [emoji: string]: string[] }
  replyTo?: string
}

interface EnhancedChatProps {
  roomId: string
  userId: string
  userName: string
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

export function EnhancedChat({ 
  roomId, 
  userId, 
  userName, 
  isMinimized = false, 
  onToggleMinimize 
}: EnhancedChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [typing, setTyping] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    initializeSocket()
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
    if (!isMinimized) {
      setUnreadCount(0)
    }
  }, [messages, isMinimized])

  const initializeSocket = () => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    })

    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      setIsConnected(true)
      socketInstance.emit("join-room", roomId, userId, userName)
    })

    socketInstance.on("disconnect", () => {
      setIsConnected(false)
    })

    socketInstance.on("new-message", (message: Message) => {
      setMessages(prev => [...prev, message])
      if (isMinimized && message.userId !== userId) {
        setUnreadCount(prev => prev + 1)
      }
    })

    socketInstance.on("user-typing", (data: { userId: string, userName: string }) => {
      if (data.userId !== userId) {
        setTyping(prev => [...prev.filter(id => id !== data.userId), data.userId])
      }
    })

    socketInstance.on("user-stopped-typing", (data: { userId: string }) => {
      setTyping(prev => prev.filter(id => id !== data.userId))
    })

    socketInstance.on("room-state", (state: any) => {
      if (state.messages) {
        setMessages(state.messages)
      }
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) return

    const messageData = {
      roomId,
      content: newMessage.trim(),
      type: "text" as const,
      replyTo: replyingTo?.id,
    }

    socket.emit("send-message", messageData)
    setNewMessage("")
    setReplyingTo(null)
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socket.emit("typing-stop", roomId)
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (socket && isConnected) {
      socket.emit("typing-start", roomId)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing-stop", roomId)
      }, 1000)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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
        
        const messageData = {
          roomId,
          content: `Shared a file: ${fileName}`,
          type: file.type.startsWith("image/") ? "image" : "file",
          fileUrl,
          fileName,
        }

        socket.emit("send-message", messageData)
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

  const addReaction = (messageId: string, emoji: string) => {
    // This would be implemented with socket events
    console.log("Add reaction:", messageId, emoji)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderMessage = (message: Message) => {
    const isOwn = message.userId === userId
    const replyMessage = message.replyTo ? messages.find(m => m.id === message.replyTo) : null

    return (
      <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4 group`}>
        <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
          {!isOwn && (
            <div className="flex items-center mb-1">
              <Avatar className="w-6 h-6 mr-2">
                <AvatarFallback className="text-xs bg-blue-500 text-white">
                  {message.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500">{message.userName}</span>
              <span className="text-xs text-gray-400 ml-2">{formatTime(message.timestamp)}</span>
            </div>
          )}

          {replyMessage && (
            <div className="bg-gray-100 border-l-2 border-blue-500 p-2 mb-2 rounded text-xs">
              <div className="font-medium text-gray-600">{replyMessage.userName}</div>
              <div className="text-gray-500 truncate">{replyMessage.content}</div>
            </div>
          )}

          <div
            className={`p-3 rounded-lg relative ${
              isOwn
                ? "bg-blue-600 text-white"
                : message.type === "system"
                ? "bg-gray-200 text-gray-700 text-center"
                : "bg-white border shadow-sm"
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
                    className={`${isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'} underline`}
                  >
                    {message.fileName}
                  </a>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            )}

            {/* Message Actions */}
            <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1 bg-white rounded-full shadow-lg p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0"
                  onClick={() => addReaction(message.id, "👍")}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0"
                  onClick={() => addReaction(message.id, "❤️")}
                >
                  <Heart className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-6 h-6 p-0"
                  onClick={() => setReplyingTo(message)}
                >
                  <Reply className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Reactions */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(message.reactions).map(([emoji, users]) => (
                  <Badge
                    key={emoji}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-gray-200"
                    onClick={() => addReaction(message.id, emoji)}
                  >
                    {emoji} {users.length}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {isOwn && (
            <div className="text-xs text-gray-400 text-right mt-1">
              {formatTime(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggleMinimize}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg relative"
        >
          <Send className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Chat</h3>
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          {onToggleMinimize && (
            <Button variant="ghost" size="sm" onClick={onToggleMinimize}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {messages.map(renderMessage)}
          
          {/* Typing indicators */}
          {typing.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
              <span>
                {typing.length === 1 ? "Someone is typing..." : `${typing.length} people are typing...`}
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-blue-600 font-medium">Replying to {replyingTo.userName}</div>
              <div className="text-sm text-gray-600 truncate">{replyingTo.content}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-10"
              disabled={!isConnected}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || !isConnected}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}