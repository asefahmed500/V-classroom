"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  Reply,
  Heart,
  ThumbsUp,
  Copy,
  Trash2
} from 'lucide-react'
import { Socket } from 'socket.io-client'

interface Message {
  id: string
  message: string
  userId: string
  userName: string
  timestamp: string
  type: 'text' | 'file' | 'system'
  reactions?: { [emoji: string]: string[] }
  replyTo?: string
}

interface LiveChatProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
}

export const LiveChat = ({ socket, roomId, userId, userName }: LiveChatProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState<string[]>([])
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥']

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages?roomId=${roomId}&limit=50`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }

    if (roomId) {
      loadMessages()
    }
  }, [roomId])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('chat-message', (messageData: Message) => {
      setMessages(prev => [...prev, messageData])
    })

    socket.on('user-typing', ({ userId: typingUserId, userName: typingUserName, isTyping: typing }) => {
      if (typingUserId !== userId) {
        setIsTyping(prev => {
          if (typing) {
            return prev.includes(typingUserName) ? prev : [...prev, typingUserName]
          } else {
            return prev.filter(name => name !== typingUserName)
          }
        })
      }
    })

    socket.on('message-reaction', ({ messageId, emoji, userId: reactUserId }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.messageId === messageId) {
          const reactions = { ...msg.reactions }
          if (!reactions[emoji]) {
            reactions[emoji] = []
          }
          
          if (reactions[emoji].includes(reactUserId)) {
            reactions[emoji] = reactions[emoji].filter(id => id !== reactUserId)
            if (reactions[emoji].length === 0) {
              delete reactions[emoji]
            }
          } else {
            reactions[emoji].push(reactUserId)
          }
          
          return { ...msg, reactions }
        }
        return msg
      }))
    })

    socket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId))
    })

    return () => {
      socket.off('chat-message')
      socket.off('user-typing')
      socket.off('message-reaction')
      socket.off('message-deleted')
    }
  }, [socket, userId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !socket) return

    const messageData = {
      message: newMessage.trim(),
      userId,
      userName,
      type: 'text',
      replyTo: replyingTo?.messageId
    }

    try {
      // Save to database first
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, ...messageData })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add to local messages
        setMessages(prev => [...prev, data.message])
        
        // Send to other users via socket
        socket.emit('chat-message', { roomId, ...messageData })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
    
    // Clear input and reply
    setNewMessage('')
    setReplyingTo(null)
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socket.emit('user-typing', { roomId, userId, userName, isTyping: false })
  }, [newMessage, socket, roomId, userId, userName, replyingTo])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    if (!socket) return

    // Send typing indicator
    socket.emit('user-typing', { roomId, userId, userName, isTyping: true })
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user-typing', { roomId, userId, userName, isTyping: false })
    }, 1000)
  }, [socket, roomId, userId, userName])

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // Add reaction
  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (!socket) return
    
    socket.emit('message-reaction', { roomId, messageId, emoji, userId })
    setShowEmojiPicker(null)
  }, [socket, roomId, userId])

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    if (!socket) return
    
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
    socket.emit('message-deleted', { roomId, messageId })
  }, [socket, roomId])

  // Copy message
  const copyMessage = useCallback((message: string) => {
    navigator.clipboard.writeText(message)
  }, [])

  // Get user initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get user color
  const getUserColor = (userId: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Live Chat
          </CardTitle>
          <Badge variant="secondary">{messages.length} messages</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.userId === userId
              const showAvatar = index === 0 || messages[index - 1].userId !== message.userId
              const replyMessage = message.replyTo ? messages.find(m => m.id === message.replyTo) : null

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`text-white text-xs ${getUserColor(message.userId)}`}>
                          {getInitials(message.userName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>

                  {/* Message */}
                  <div className={`flex-1 max-w-xs ${isOwn ? 'text-right' : ''}`}>
                    {/* User name and time */}
                    {showAvatar && (
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
                        <span className="text-sm font-medium text-gray-900">
                          {message.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}

                    {/* Reply indicator */}
                    {replyMessage && (
                      <div className={`text-xs text-gray-500 mb-1 ${isOwn ? 'text-right' : ''}`}>
                        <Reply className="w-3 h-3 inline mr-1" />
                        Replying to {replyMessage.userName}
                      </div>
                    )}

                    {/* Message content */}
                    <div className="relative">
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.message}
                      </div>

                      {/* Message actions */}
                      <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                        isOwn ? '-left-20' : '-right-20'
                      }`}>
                        <div className="flex items-center gap-1 bg-white border rounded-lg shadow-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowEmojiPicker(
                              showEmojiPicker === message.id ? null : message.id
                            )}
                          >
                            <Smile className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setReplyingTo(message)}
                          >
                            <Reply className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyMessage(message.message)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {isOwn && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => deleteMessage(message.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Emoji picker */}
                      {showEmojiPicker === message.id && (
                        <div className={`absolute top-8 z-10 bg-white border rounded-lg shadow-lg p-2 ${
                          isOwn ? 'right-0' : 'left-0'
                        }`}>
                          <div className="flex gap-1">
                            {emojis.map(emoji => (
                              <button
                                key={emoji}
                                className="hover:bg-gray-100 p-1 rounded text-lg"
                                onClick={() => addReaction(message.id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                        {Object.entries(message.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            className={`text-xs px-2 py-1 rounded-full border ${
                              userIds.includes(userId)
                                ? 'bg-blue-100 border-blue-300'
                                : 'bg-gray-100 border-gray-300'
                            }`}
                            onClick={() => addReaction(message.id, emoji)}
                          >
                            {emoji} {userIds.length}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          
          {/* Typing indicator */}
          {isTyping.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
              <span>
                {isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-6 py-2 bg-gray-50 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-600">Replying to </span>
                <span className="font-medium">{replyingTo.userName}</span>
                <p className="text-gray-500 truncate">{replyingTo.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}