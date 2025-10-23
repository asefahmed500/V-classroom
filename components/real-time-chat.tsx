"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Send, Smile, Paperclip, MoreVertical, 
  Reply, Edit, Trash2, Copy, Heart,
  ThumbsUp, Laugh, Angry, Sad
} from "lucide-react"
import { toast } from "sonner"
import { Socket } from "socket.io-client"

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  type: 'text' | 'file' | 'image' | 'system'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  timestamp: Date
  reactions: Array<{
    userId: string
    userName: string
    emoji: string
    timestamp: Date
  }>
  isEdited: boolean
  editedAt?: Date
}

interface RealTimeChatProps {
  roomId: string
  userId: string
  userName: string
  socket: Socket | null
}

export function RealTimeChat({
  roomId,
  userId,
  userName,
  socket
}: RealTimeChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉']

  useEffect(() => {
    if (!socket) return

    // Load existing messages
    loadMessages()

    // Socket event listeners
    socket.on("chat-message", handleNewMessage)
    socket.on("message-reaction", handleMessageReaction)
    socket.on("message-edited", handleMessageEdit)
    socket.on("user-typing", handleUserTyping)
    socket.on("user-stopped-typing", handleUserStoppedTyping)

    return () => {
      socket.off("chat-message", handleNewMessage)
      socket.off("message-reaction", handleMessageReaction)
      socket.off("message-edited", handleMessageEdit)
      socket.off("user-typing", handleUserTyping)
      socket.off("user-stopped-typing", handleUserStoppedTyping)
    }
  }, [socket])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/video-calls/${roomId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const handleNewMessage = (message: any) => {
    setMessages(prev => [...prev, {
      ...message,
      timestamp: new Date(message.timestamp)
    }])
  }

  const handleMessageReaction = ({ messageId, emoji, userId: reactorId, userName: reactorName, action }: any) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        let newReactions = [...msg.reactions]
        
        if (action === 'add') {
          // Remove existing reaction from this user for this emoji
          newReactions = newReactions.filter(r => !(r.userId === reactorId && r.emoji === emoji))
          // Add new reaction
          newReactions.push({
            userId: reactorId,
            userName: reactorName,
            emoji,
            timestamp: new Date()
          })
        } else if (action === 'remove') {
          newReactions = newReactions.filter(r => !(r.userId === reactorId && r.emoji === emoji))
        }
        
        return { ...msg, reactions: newReactions }
      }
      return msg
    }))
  }

  const handleMessageEdit = ({ messageId, newContent, editedAt }: any) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          content: newContent,
          isEdited: true,
          editedAt: new Date(editedAt)
        }
      }
      return msg
    }))
  }

  const handleUserTyping = ({ userId: typingUserId, userName: typingUserName }: any) => {
    if (typingUserId !== userId) {
      setTypingUsers(prev => {
        if (!prev.includes(typingUserName)) {
          return [...prev, typingUserName]
        }
        return prev
      })
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(name => name !== typingUserName))
      }, 3000)
    }
  }

  const handleUserStoppedTyping = ({ userId: typingUserId }: any) => {
    // This will be handled by the timeout in handleUserTyping
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket) return

    try {
      const response = await fetch(`/api/video-calls/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'text'
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Emit to socket for real-time delivery
        socket.emit("chat-message", {
          roomId,
          message: data.message
        })
        
        setNewMessage("")
        stopTyping()
      } else {
        toast.error("Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    if (!isTyping) {
      setIsTyping(true)
      socket?.emit("user-typing", {
        roomId,
        userId,
        userName,
        isTyping: true
      })
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 1000)
  }

  const stopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      socket?.emit("user-typing", {
        roomId,
        userId,
        userName,
        isTyping: false
      })
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const addReaction = (messageId: string, emoji: string) => {
    socket?.emit("message-reaction", {
      roomId,
      messageId,
      emoji,
      userId,
      userName,
      action: 'add'
    })
    setShowEmojiPicker(null)
  }

  const removeReaction = (messageId: string, emoji: string) => {
    socket?.emit("message-reaction", {
      roomId,
      messageId,
      emoji,
      userId,
      userName,
      action: 'remove'
    })
  }

  const startEdit = (message: Message) => {
    setEditingMessage(message.id)
    setEditContent(message.content)
  }

  const saveEdit = () => {
    if (!editContent.trim() || !editingMessage) return

    socket?.emit("edit-message", {
      roomId,
      messageId: editingMessage,
      newContent: editContent.trim(),
      userId
    })

    setEditingMessage(null)
    setEditContent("")
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setEditContent("")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/video-calls/${roomId}/files`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        
        // Send file message
        const messageResponse = await fetch(`/api/video-calls/${roomId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: `Shared a file: ${file.name}`,
            type: 'file',
            fileUrl: data.file.fileUrl,
            fileName: data.file.fileName,
            fileSize: data.file.fileSize
          })
        })

        if (messageResponse.ok) {
          const messageData = await messageResponse.json()
          
          socket?.emit("chat-message", {
            roomId,
            message: messageData.message
          })
          
          toast.success("File shared successfully")
        }
      } else {
        toast.error("Failed to upload file")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error("Failed to upload file")
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Message copied to clipboard")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const MessageComponent = ({ message }: { message: Message }) => {
    const isOwnMessage = message.userId === userId
    const hasReactions = message.reactions.length > 0

    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}>
        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {/* Message header */}
          {!isOwnMessage && (
            <div className="text-xs text-gray-400 mb-1 px-3">
              {message.userName}
            </div>
          )}
          
          {/* Message bubble */}
          <div className={`relative px-4 py-2 rounded-lg ${
            isOwnMessage 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-white'
          }`}>
            {editingMessage === message.id ? (
              <div className="space-y-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="bg-transparent border-gray-500 text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      saveEdit()
                    } else if (e.key === 'Escape') {
                      cancelEdit()
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {message.type === 'file' ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="w-4 h-4" />
                      <span className="font-medium">{message.fileName}</span>
                    </div>
                    {message.fileSize && (
                      <div className="text-xs opacity-75">
                        {formatFileSize(message.fileSize)}
                      </div>
                    )}
                    {message.fileUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(message.fileUrl, '_blank')}
                        className="w-full"
                      >
                        Download
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
                
                {/* Message actions */}
                <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1 shadow-lg">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                      className="p-1 h-auto"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    
                    {isOwnMessage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(message)}
                        className="p-1 h-auto"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyMessage(message.content)}
                      className="p-1 h-auto"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Emoji picker */}
          {showEmojiPicker === message.id && (
            <div className="absolute z-10 bg-gray-800 rounded-lg p-2 shadow-lg mt-1">
              <div className="flex space-x-1">
                {emojis.map((emoji) => (
                  <Button
                    key={emoji}
                    size="sm"
                    variant="ghost"
                    onClick={() => addReaction(message.id, emoji)}
                    className="p-1 h-auto text-lg hover:bg-gray-700"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Reactions */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(
                message.reactions.reduce((acc, reaction) => {
                  if (!acc[reaction.emoji]) {
                    acc[reaction.emoji] = []
                  }
                  acc[reaction.emoji].push(reaction)
                  return acc
                }, {} as Record<string, typeof message.reactions>)
              ).map(([emoji, reactions]) => {
                const hasUserReaction = reactions.some(r => r.userId === userId)
                return (
                  <Button
                    key={emoji}
                    size="sm"
                    variant={hasUserReaction ? "default" : "outline"}
                    onClick={() => hasUserReaction ? removeReaction(message.id, emoji) : addReaction(message.id, emoji)}
                    className="h-6 px-2 text-xs"
                  >
                    {emoji} {reactions.length}
                  </Button>
                )
              })}
            </div>
          )}
          
          {/* Message timestamp */}
          <div className={`text-xs text-gray-400 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.timestamp)}
            {message.isEdited && (
              <span className="ml-1 opacity-75">(edited)</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}
          
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="*/*"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
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