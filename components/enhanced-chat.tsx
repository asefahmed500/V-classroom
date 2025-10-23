"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Paperclip, Image, File, Smile } from "lucide-react"
import { io, Socket } from "socket.io-client"

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  type: "text" | "file" | "image"
  timestamp: string
  fileUrl?: string
  fileName?: string
}

interface EnhancedChatProps {
  roomId: string
  userId: string
  userName: string
}

export function EnhancedChat({ roomId, userId, userName }: EnhancedChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isTyping, setIsTyping] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize Socket.IO connection with better error handling
  useEffect(() => {
    if (!roomId || !userId || !userName) return

    const initializeSocket = async () => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
        console.log("Attempting chat connection to:", socketUrl)
        
        const newSocket = io(socketUrl, {
          path: "/socket.io/",
          transports: ["polling", "websocket"],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
        })

        newSocket.on("connect", () => {
          console.log("Chat connected to Socket.IO server")
          setIsConnected(true)
          newSocket.emit("join-room", roomId, userId, userName)
        })

        newSocket.on("connect_error", (error) => {
          console.error("Chat connection error:", error)
          setIsConnected(false)
        })

        newSocket.on("disconnect", (reason) => {
          console.log("Chat disconnected:", reason)
          setIsConnected(false)
        })

        newSocket.on("new-message", (message: Message) => {
          setMessages(prev => [...prev, message])
          
          // Show notification for messages from others
          if (message.userId !== userId && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`${message.userName} in ${roomId.slice(-8)}`, {
              body: message.content,
              icon: "/favicon.ico"
            })
          }
        })

        newSocket.on("user-typing", ({ userId: typingUserId, userName: typingUserName }) => {
          if (typingUserId !== userId) {
            setIsTyping(prev => [...prev.filter(name => name !== typingUserName), typingUserName])
            
            // Clear typing indicator after 3 seconds
            setTimeout(() => {
              setIsTyping(prev => prev.filter(name => name !== typingUserName))
            }, 3000)
          }
        })

        newSocket.on("user-stopped-typing", ({ userId: typingUserId, userName: typingUserName }) => {
          if (typingUserId !== userId) {
            setIsTyping(prev => prev.filter(name => name !== typingUserName))
          }
        })

        newSocket.on("room-state", ({ messages: roomMessages }) => {
          if (Array.isArray(roomMessages)) {
            setMessages(roomMessages)
          }
        })

        setSocket(newSocket)

        return () => {
          newSocket.disconnect()
        }
      } catch (error) {
        console.error("Failed to initialize chat socket:", error)
        setIsConnected(false)
      }
    }

    initializeSocket()
  }, [roomId, userId, userName])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return

    const messageData = {
      roomId,
      content: newMessage.trim(),
      type: "text" as const
    }

    socket.emit("send-message", messageData)
    setNewMessage("")
    
    // Stop typing indicator
    socket.emit("stop-typing", { roomId, userId, userName })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    
    if (!socket) return

    // Send typing indicator
    socket.emit("user-typing", { roomId, userId, userName })
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { roomId, userId, userName })
    }, 1000)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !socket) return

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("roomId", roomId)

      // Upload file to server
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        
        // Send file message
        const messageData = {
          roomId,
          content: file.name,
          type: file.type.startsWith("image/") ? "image" : "file",
          fileUrl: data.url,
          fileName: file.name
        }

        socket.emit("send-message", messageData)
      } else {
        console.error("File upload failed")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.userId === userId
    
    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
      >
        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? "order-2" : "order-1"}`}>
          {!isOwnMessage && (
            <div className="text-xs text-gray-500 mb-1">{message.userName}</div>
          )}
          
          <div
            className={`px-4 py-2 rounded-lg ${
              isOwnMessage
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            {message.type === "text" && (
              <p className="text-sm">{message.content}</p>
            )}
            
            {message.type === "image" && message.fileUrl && (
              <div>
                <img
                  src={message.fileUrl}
                  alt={message.fileName}
                  className="max-w-full h-auto rounded mb-2"
                />
                <p className="text-xs opacity-75">{message.fileName}</p>
              </div>
            )}
            
            {message.type === "file" && message.fileUrl && (
              <div className="flex items-center space-x-2">
                <File className="w-4 h-4" />
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline hover:no-underline"
                >
                  {message.fileName}
                </a>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Chat</h3>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          
          {/* Typing indicators */}
          {isTyping.length > 0 && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">
                <div className="flex items-center space-x-1">
                  <span>{isTyping.join(", ")} {isTyping.length === 1 ? "is" : "are"} typing</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!isConnected}
          />
          
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            size="sm"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  )
}