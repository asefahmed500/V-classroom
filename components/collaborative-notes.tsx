"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  FileText, 
  User, 
  Clock,
  Download,
  Share2
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Note {
  id: string
  title: string
  content: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
  isEditing?: boolean
}

interface CollaborativeNotesProps {
  roomId: string
  userId: string
}

export function CollaborativeNotes({ roomId, userId }: CollaborativeNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newNote, setNewNote] = useState({ title: "", content: "" })
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState({ id: "", name: "" })

  useEffect(() => {
    fetchCurrentUser()
    fetchNotes()
    initializeSocket()

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
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

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/notes`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error)
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

    socketInstance.on("note-created", (note: Note) => {
      setNotes(prev => [note, ...prev])
    })

    socketInstance.on("note-updated", (updatedNote: Note) => {
      setNotes(prev => prev.map(note => 
        note.id === updatedNote.id ? updatedNote : note
      ))
    })

    socketInstance.on("note-deleted", (noteId: string) => {
      setNotes(prev => prev.filter(note => note.id !== noteId))
    })
  }

  const createNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    try {
      const response = await fetch(`/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNote.title.trim(),
          content: newNote.content.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const note = data.note

        // Add to local state
        setNotes(prev => [note, ...prev])

        // Broadcast to other users
        if (socket) {
          socket.emit("note-create", {
            roomId,
            title: note.title,
            content: note.content,
          })
        }

        // Reset form
        setNewNote({ title: "", content: "" })
        setIsCreating(false)
      }
    } catch (error) {
      console.error("Failed to create note:", error)
    }
  }

  const updateNote = async (noteId: string, title: string, content: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedNote = data.note

        // Update local state
        setNotes(prev => prev.map(note => 
          note.id === noteId ? updatedNote : note
        ))

        // Broadcast to other users
        if (socket) {
          socket.emit("note-update", {
            roomId,
            noteId,
            title: updatedNote.title,
            content: updatedNote.content,
          })
        }

        setEditingNote(null)
      }
    } catch (error) {
      console.error("Failed to update note:", error)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      const response = await fetch(`/api/rooms/${roomId}/notes/${noteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))

        if (socket) {
          socket.emit("note-delete", { roomId, noteId })
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  const exportNotes = () => {
    const notesText = notes.map(note => 
      `# ${note.title}\n\nCreated by: ${note.createdByName}\nCreated: ${new Date(note.createdAt).toLocaleString()}\n\n${note.content}\n\n---\n\n`
    ).join("")

    const blob = new Blob([notesText], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `study-notes-${roomId}-${Date.now()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Collaborative Notes</h3>
          <Badge variant="outline">{notes.length} notes</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportNotes}
            disabled={notes.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {/* Create New Note Form */}
            {isCreating && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Create New Note</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsCreating(false)
                        setNewNote({ title: "", content: "" })
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Note title..."
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Start writing your note..."
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false)
                        setNewNote({ title: "", content: "" })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={createNote}
                      disabled={!newNote.title.trim() || !newNote.content.trim()}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes List */}
            {notes.length === 0 && !isCreating ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notes yet</p>
                <p className="text-sm">Create your first collaborative note to get started</p>
              </div>
            ) : (
              notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isEditing={editingNote === note.id}
                  currentUserId={currentUser.id}
                  onEdit={() => setEditingNote(note.id)}
                  onSave={(title, content) => updateNote(note.id, title, content)}
                  onCancel={() => setEditingNote(null)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

interface NoteCardProps {
  note: Note
  isEditing: boolean
  currentUserId: string
  onEdit: () => void
  onSave: (title: string, content: string) => void
  onCancel: () => void
  onDelete: () => void
}

function NoteCard({ note, isEditing, currentUserId, onEdit, onSave, onCancel, onDelete }: NoteCardProps) {
  const [editTitle, setEditTitle] = useState(note.title)
  const [editContent, setEditContent] = useState(note.content)

  const handleSave = () => {
    if (editTitle.trim() && editContent.trim()) {
      onSave(editTitle, editContent)
    }
  }

  const handleCancel = () => {
    setEditTitle(note.title)
    setEditContent(note.content)
    onCancel()
  }

  const canEdit = note.createdBy === currentUserId

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-semibold"
            />
            <div className="flex justify-end space-x-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={!editTitle.trim() || !editContent.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{note.title}</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {note.createdByName}
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(note.createdAt)}
                </div>
                {note.updatedAt !== note.createdAt && (
                  <Badge variant="secondary" className="text-xs">
                    Updated {formatTime(note.updatedAt)}
                  </Badge>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center space-x-1 ml-4">
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={8}
            className="resize-none"
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-700">
            {note.content}
          </div>
        )}
      </CardContent>
    </Card>
  )
}