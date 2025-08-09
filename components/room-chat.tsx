"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageCircle, Code, FileText, Image, Smile, Paperclip, MoreVertical, Reply, Heart, ThumbsUp } from "lucide-react"
import { Socket } from "socket.io-client"
import { socketManager } from "@/lib/socket-client"

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  type: 'text' | 'code' | 'file' | 'image' | 'system'
  timestamp: Date
  isSystem?: boolean
  reactions?: { [emoji: string]: string[] } // emoji -> array of user IDs who reacted
  replyTo?: string // ID of message being replied to
  edited?: boolean
  editedAt?: Date
}

interface RoomChatProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
}

export function RoomChat({ socket, roomId, userId, userName }: RoomChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize socket and set up event listeners
  useEffect(() => {
    let mounted = true

    const initSocket = async () => {
      try {
        // Always use the socket passed from parent component for consistency
        const socketInstance = socket
        if (!socketInstance || !mounted) return

        // Connection status handlers
        const handleConnect = () => {
          if (!mounted) return
          setIsConnected(true)
          console.log('Chat connected to room:', roomId)
          socketInstance.emit('join-chat', { roomId, userId, userName })
        }

        const handleDisconnect = () => {
          if (!mounted) return
          setIsConnected(false)
          console.log('Chat disconnected from room:', roomId)
        }

        const handleReconnect = () => {
          if (!mounted) return
          setIsConnected(true)
          console.log('Chat reconnected to room:', roomId)
          socketInstance.emit('join-chat', { roomId, userId, userName })
        }

        const handleConnectionConfirmed = () => {
          if (!mounted) return
          setIsConnected(true)
          console.log('Chat connection confirmed for room:', roomId)
        }

        // Set initial connection status
        setIsConnected(socketInstance.connected)

        socketInstance.on('connect', handleConnect)
        socketInstance.on('disconnect', handleDisconnect)
        socketInstance.on('reconnect', handleReconnect)
        socketInstance.on('connection-confirmed', handleConnectionConfirmed)

        // Message event handlers
        const handleRoomMessages = (roomMessages: Message[]) => {
          if (!mounted) return
          setMessages(roomMessages)
        }

        const handleChatMessage = (message: Message) => {
          if (!mounted) return
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev
            }
            return [...prev, message]
          })
        }

        const handleMessageReaction = ({ messageId, emoji, userId: reactorId, userName: reactorName, action }) => {
          if (!mounted) return
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              const reactions = { ...msg.reactions } || {}
              if (!reactions[emoji]) reactions[emoji] = []
              
              if (action === 'add') {
                if (!reactions[emoji].includes(reactorId)) {
                  reactions[emoji].push(reactorId)
                }
              } else if (action === 'remove') {
                reactions[emoji] = reactions[emoji].filter(id => id !== reactorId)
                if (reactions[emoji].length === 0) {
                  delete reactions[emoji]
                }
              }
              
              return { ...msg, reactions }
            }
            return msg
          }))
        }

        const handleMessageEdit = ({ messageId, newContent, editedAt }) => {
          if (!mounted) return
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              return { ...msg, content: newContent, edited: true, editedAt: new Date(editedAt) }
            }
            return msg
          }))
        }

        const handleUserJoined = ({ userName: joinedUserName }) => {
          if (!mounted) return
          const systemMessage: Message = {
            id: `system_${Date.now()}_${Math.random()}`,
            userId: 'system',
            userName: 'System',
            content: `${joinedUserName} joined the room`,
            type: 'system',
            timestamp: new Date(),
            isSystem: true
          }
          setMessages(prev => [...prev, systemMessage])
        }

        const handleUserLeft = ({ userName: leftUserName }) => {
          if (!mounted) return
          const systemMessage: Message = {
            id: `system_${Date.now()}_${Math.random()}`,
            userId: 'system',
            userName: 'System',
            content: `${leftUserName} left the room`,
            type: 'system',
            timestamp: new Date(),
            isSystem: true
          }
          setMessages(prev => [...prev, systemMessage])
        }

        const handleUserTyping = ({ userId: typingUserId, userName: typingUserName, isTyping: typing }) => {
          if (!mounted || typingUserId === userId) return
          setTypingUsers(prev => {
            if (typing) {
              return prev.includes(typingUserName) ? prev : [...prev, typingUserName]
            } else {
              return prev.filter(name => name !== typingUserName)
            }
          })
        }

        const handleCodeShared = (data) => {
          if (!mounted) return
          const codeMessage: Message = {
            id: `code_${Date.now()}_${Math.random()}`,
            userId: data.userId,
            userName: data.userName,
            content: data.code,
            type: 'code',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, codeMessage])
        }

        // Set up event listeners
        socketInstance.on('room-messages', handleRoomMessages)
        socketInstance.on('chat-message', handleChatMessage)
        socketInstance.on('message-reaction', handleMessageReaction)
        socketInstance.on('message-edited', handleMessageEdit)
        socketInstance.on('user-typing', handleUserTyping)
        socketInstance.on('user-joined', handleUserJoined)
        socketInstance.on('user-left', handleUserLeft)
        socketInstance.on('code-shared', handleCodeShared)

        // Request existing messages if already connected
        if (socketInstance.connected) {
          socketInstance.emit('join-chat', { roomId, userId, userName })
        }

        // No need to store socket reference as it's passed from parent

        return () => {
          socketInstance.off('connect', handleConnect)
          socketInstance.off('disconnect', handleDisconnect)
          socketInstance.off('reconnect', handleReconnect)
          socketInstance.off('connection-confirmed', handleConnectionConfirmed)
          socketInstance.off('room-messages', handleRoomMessages)
          socketInstance.off('chat-message', handleChatMessage)
          socketInstance.off('message-reaction', handleMessageReaction)
          socketInstance.off('message-edited', handleMessageEdit)
          socketInstance.off('user-typing', handleUserTyping)
          socketInstance.off('user-joined', handleUserJoined)
          socketInstance.off('user-left', handleUserLeft)
          socketInstance.off('code-shared', handleCodeShared)
        }
      } catch (error) {
        console.error('Failed to initialize chat socket:', error)
        setIsConnected(false)
      }
    }

    initSocket()

    return () => {
      mounted = false
    }
  }, [userId, roomId, userName])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) return

    const message: Message = {
      id: `msg_${Date.now()}_${userId}_${Math.random()}`,
      userId,
      userName,
      content: newMessage.trim(),
      type: 'text',
      timestamp: new Date(),
      replyTo: replyingTo?.id
    }

    // Send to server (server will broadcast to all users including sender)
    socket.emit('chat-message', {
      roomId,
      message
    })

    setNewMessage("")
    setReplyingTo(null)
    handleStopTyping()
    
    // Focus back to input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket) return
    
    socket.emit('message-reaction', {
      roomId,
      messageId,
      emoji,
      userId,
      userName,
      action: 'add'
    })
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleEdit = (messageId: string, newContent: string) => {
    if (!socket) return
    
    socket.emit('edit-message', {
      roomId,
      messageId,
      newContent,
      userId
    })
    
    setEditingMessage(null)
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)

    if (!socket) return

    if (!isTyping) {
      setIsTyping(true)
      socket.emit('user-typing', {
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
      handleStopTyping()
    }, 1000)
  }

  const handleStopTyping = () => {
    if (isTyping && socket) {
      setIsTyping(false)
      socket.emit('user-typing', {
        roomId,
        userId,
        userName,
        isTyping: false
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.userId === userId
    const isSystemMessage = message.type === 'system'
    
    if (isSystemMessage) {
      return (
        <div key={message.id} className="flex justify-center mb-2">
          <div className="bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-xs">
            {message.content}
          </div>
        </div>
      )
    }

    const replyToMessage = message.replyTo ? messages.find(m => m.id === message.replyTo) : null

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 group`}
      >
        <div className="flex items-start space-x-2 max-w-[80%]">
          {!isOwnMessage && (
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {message.userName.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex flex-col">
            <div
              className={`rounded-lg px-3 py-2 relative ${
                isOwnMessage
                  ? 'bg-blue-600 text-white ml-auto'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              {!isOwnMessage && (
                <div className="text-xs font-medium mb-1 text-blue-300">
                  {message.userName}
                </div>
              )}
              
              {/* Reply indicator */}
              {replyToMessage && (
                <div className="mb-2 p-2 bg-black bg-opacity-20 rounded border-l-2 border-gray-400">
                  <div className="text-xs opacity-70 mb-1">
                    Replying to {replyToMessage.userName}
                  </div>
                  <div className="text-xs opacity-80 truncate">
                    {replyToMessage.content.substring(0, 50)}...
                  </div>
                </div>
              )}
              
              {message.type === 'code' ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1">
                    <Code className="w-3 h-3" />
                    <span className="text-xs opacity-70">Code Snippet</span>
                  </div>
                  <pre className="bg-black bg-opacity-30 rounded p-2 text-xs overflow-x-auto">
                    <code>{message.content}</code>
                  </pre>
                </div>
              ) : (
                <div className="break-words whitespace-pre-wrap">{message.content}</div>
              )}
              
              <div className="flex items-center justify-between mt-1">
                <div className={`text-xs opacity-70 flex items-center space-x-1`}>
                  <span>{formatTime(message.timestamp)}</span>
                  {message.edited && (
                    <span className="italic">(edited)</span>
                  )}
                </div>
                
                {/* Message actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReaction(message.id, '👍')}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReaction(message.id, '❤️')}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <Heart className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReply(message)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <Reply className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Reactions */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 ml-2">
                {Object.entries(message.reactions).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message.id, emoji)}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      userIds.includes(userId)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {emoji} {userIds.length}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {isOwnMessage && (
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {message.userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-gray-300" />
            <h3 className="text-white font-medium">Chat</h3>
            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
              {messages.length}
            </Badge>
          </div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start mb-3">
              <div className="bg-gray-700 rounded-lg px-3 py-2 max-w-[70%]">
                <div className="text-sm text-gray-300 flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        {/* Reply indicator */}
        {replyingTo && (
          <div className="mb-2 p-2 bg-gray-700 rounded border-l-2 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-300 mb-1">
                  Replying to {replyingTo.userName}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {replyingTo.content.substring(0, 50)}...
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(null)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Type a message..."}
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
            disabled={!socket || !isConnected}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !socket || !isConnected}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-400 mt-1">Disconnected - trying to reconnect...</p>
        )}
      </div>
    </div>
  )
}