"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { io, Socket } from 'socket.io-client'
import { 
  FileText, 
  Save, 
  Download, 
  Users
} from 'lucide-react'

interface CollaborativeNotesProps {
  roomId: string
  userId: string
  userName?: string
}

export const CollaborativeNotes = ({ roomId, userId, userName = 'Anonymous' }: CollaborativeNotesProps) => {
  const [content, setContent] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io()
    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Load initial notes data
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await fetch(`/api/notes/save?roomId=${roomId}`)
        if (response.ok) {
          const data = await response.json()
          setContent(data.content || '')
          if (data.lastModifiedAt) {
            setLastSaved(new Date(data.lastModifiedAt))
          }
        }
      } catch (error) {
        console.error('Failed to load notes:', error)
      }
    }

    if (roomId) {
      loadNotes()
    }
  }, [roomId])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('notes-update', (newContent: string) => {
      setContent(newContent)
    })

    socket.on('user-typing', ({ userId: typingUserId, userName: typingUserName, isTyping: typing }) => {
      if (typingUserId !== userId) {
        setCollaborators(prev => {
          if (typing) {
            return prev.includes(typingUserName) ? prev : [...prev, typingUserName]
          } else {
            return prev.filter(name => name !== typingUserName)
          }
        })
      }
    })

    socket.on('notes-saved', ({ timestamp }) => {
      setLastSaved(new Date(timestamp))
    })

    return () => {
      socket.off('notes-update')
      socket.off('user-typing')
      socket.off('notes-saved')
    }
  }, [socket, userId])

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)

    // Broadcast content change
    if (socket) {
      socket.emit('notes-update', { roomId, notes: newContent })
    }

    // Handle typing indicator
    socket?.emit('user-typing', { roomId, userId, userName, isTyping: true })

    // Clear typing after 1 second
    setTimeout(() => {
      socket?.emit('user-typing', { roomId, userId, userName, isTyping: false })
    }, 1000)
  }

  // Save notes
  const saveNotes = async () => {
    try {
      const response = await fetch('/api/notes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          content,
          userId,
          userName
        })
      })

      if (response.ok) {
        const timestamp = new Date()
        setLastSaved(timestamp)
        
        if (socket) {
          socket.emit('notes-saved', { roomId, timestamp: timestamp.toISOString() })
        }
      }
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }

  // Download notes
  const downloadNotes = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notes-${roomId}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Collaborative Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {collaborators.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {collaborators.length} typing
              </Badge>
            )}
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Editor */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Start taking collaborative notes... Everyone in the room can edit this document in real-time."
            className="w-full h-full min-h-[400px] p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-sm text-gray-600">
            {collaborators.length > 0 && (
              <span>
                • {collaborators.join(', ')} {collaborators.length === 1 ? 'is' : 'are'} typing...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={saveNotes}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadNotes}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}