"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Code, Play, Share, Copy, Users, Terminal, Save, Download, Upload } from "lucide-react"
import { Socket } from "socket.io-client"
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface CodeCollaborationProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
}

interface Cursor {
  userId: string
  userName: string
  position: number
  color: string
}

interface ExecutionResult {
  output: string
  error?: string
  timestamp: number
  userId: string
  userName: string
}

export function CodeCollaboration({ socket, roomId, userId, userName }: CodeCollaborationProps) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([])
  const [connectedUsers, setConnectedUsers] = useState<string[]>([])
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(true)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const ytextRef = useRef<Y.Text | null>(null)
  const userColors = useRef<Map<string, string>>(new Map())

  // Initialize Yjs for collaborative editing
  useEffect(() => {
    if (!isCollaborativeMode) return

    // Create Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Create WebSocket provider for real-time sync
    const provider = new WebsocketProvider(
      process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.host}/yjs` 
        : 'ws://localhost:3001/yjs',
      `code-${roomId}`,
      ydoc
    )
    providerRef.current = provider

    // Get shared text type
    const ytext = ydoc.getText('code')
    ytextRef.current = ytext

    // Set up awareness for cursors
    provider.awareness.setLocalStateField('user', {
      userId,
      userName,
      color: getUserColor(userId)
    })

    // Listen for text changes
    const updateHandler = () => {
      const newCode = ytext.toString()
      if (newCode !== code) {
        setCode(newCode)
      }
    }

    ytext.observe(updateHandler)

    // Listen for awareness changes (cursors)
    const awarenessHandler = () => {
      const states = provider.awareness.getStates()
      const newCursors = new Map<string, Cursor>()
      
      states.forEach((state, clientId) => {
        if (state.user && state.user.userId) {
          newCursors.set(state.user.userId, {
            userId: state.user.userId,
            userName: state.user.userName,
            position: state.cursor || 0,
            color: state.user.color
          })
        }
      })
      
      setCursors(newCursors)
      setConnectedUsers(Array.from(states.values()).map(s => s.user?.userName).filter(Boolean))
    }

    provider.awareness.on('change', awarenessHandler)

    return () => {
      ytext.unobserve(updateHandler)
      provider.awareness.off('change', awarenessHandler)
      provider.destroy()
      ydoc.destroy()
    }
  }, [roomId, userId, userName, isCollaborativeMode])

  // Get user color for cursors
  const getUserColor = (userId: string): string => {
    if (userColors.current.has(userId)) {
      return userColors.current.get(userId)!
    }

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
    ]
    
    const color = colors[userId.length % colors.length]
    userColors.current.set(userId, color)
    return color
  }

  // Handle text changes in collaborative mode
  const handleCodeChange = (newCode: string) => {
    if (isCollaborativeMode && ytextRef.current) {
      // Update Yjs document
      const ytext = ytextRef.current
      const currentCode = ytext.toString()
      
      if (newCode !== currentCode) {
        ytext.delete(0, currentCode.length)
        ytext.insert(0, newCode)
      }
    } else {
      // Fallback to socket-based sync
      setCode(newCode)
      if (socket) {
        socket.emit('code-update', {
          roomId,
          data: { code: newCode, language, userId, userName }
        })
      }
    }
  }

  // Handle cursor position updates
  const handleCursorChange = () => {
    if (isCollaborativeMode && textareaRef.current && providerRef.current) {
      const position = textareaRef.current.selectionStart
      providerRef.current.awareness.setLocalStateField('cursor', { position })
    }
  }

  // Socket event handlers for non-collaborative mode
  useEffect(() => {
    if (!socket || isCollaborativeMode) return

    socket.on('code-update', (data) => {
      if (data.userId !== userId) {
        setCode(data.code)
        setLanguage(data.language)
      }
    })

    socket.on('code-shared', ({ code: sharedCode, language: sharedLanguage, userId: sharedUserId }) => {
      if (sharedUserId !== userId) {
        setCode(sharedCode)
        setLanguage(sharedLanguage)
      }
    })

    socket.on('code-execution-result', ({ output: executionOutput, userId: executorId, userName: executorName, timestamp }) => {
      const result: ExecutionResult = {
        output: executionOutput,
        timestamp: timestamp || Date.now(),
        userId: executorId,
        userName: executorName
      }
      
      setExecutionHistory(prev => [...prev, result].slice(-10)) // Keep last 10 results
      
      if (executorId !== userId) {
        setOutput(executionOutput)
      }
    })

    return () => {
      socket.off('code-update')
      socket.off('code-shared')
      socket.off('code-execution-result')
    }
  }, [socket, userId, isCollaborativeMode])

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    if (socket) {
      socket.emit('code-language-change', {
        roomId,
        language: newLanguage,
        userId,
        userName
      })
    }
  }

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'css', label: 'CSS' },
    { value: 'html', label: 'HTML' }
  ]

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      css: 'css',
      html: 'html'
    }
    return extensions[lang] || 'txt'
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${getFileExtension(language)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const saveCode = async () => {
    try {
      const response = await fetch('/api/code/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          code,
          language,
          userId,
          userName
        })
      })
      
      if (response.ok) {
        alert('Code saved successfully!')
      } else {
        throw new Error('Failed to save code')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save code')
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  const runCode = async () => {
    if (!code.trim()) return
    
    setIsRunning(true)
    try {
      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          roomId,
          userId,
          userName
        })
      })
      
      const result = await response.json()
      const executionOutput = result.output || result.error || 'No output'
      setOutput(executionOutput)
      
      const executionResult: ExecutionResult = {
        output: executionOutput,
        error: result.error,
        timestamp: Date.now(),
        userId,
        userName
      }
      
      setExecutionHistory(prev => [...prev, executionResult].slice(-10))
      
      if (socket) {
        socket.emit('code-execution-result', {
          roomId,
          output: executionOutput,
          userId,
          userName
        })
      }
    } catch (error: any) {
      const errorMessage = `Execution error: ${error.message}`
      setOutput(errorMessage)
    } finally {
      setIsRunning(false)
    }
  }

  const shareCode = () => {
    if (socket && code.trim()) {
      socket.emit('code-shared', {
        roomId,
        code,
        language,
        userId,
        userName
      })
    }
  }
  re
turn (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Code Editor</h3>
          <div className="flex space-x-2">
            <Button size="sm" onClick={copyCode} variant="outline">
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
            <Button size="sm" onClick={shareCode} variant="outline">
              <Share className="w-3 h-3 mr-1" />
              Share
            </Button>
            <Button size="sm" onClick={downloadCode} variant="outline">
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            <Button size="sm" onClick={saveCode} variant="outline">
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex space-x-2 mb-4">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={runCode}
            disabled={isRunning || !code.trim()}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-3 h-3 mr-1" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>

          <Badge variant="outline" className="text-white border-gray-600">
            <Users className="w-3 h-3 mr-1" />
            {connectedUsers.length} users
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Code Editor */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">Code</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onSelect={handleCursorChange}
              placeholder="Write your code here..."
              className="min-h-[200px] bg-gray-800 border-gray-600 text-white font-mono text-sm"
              style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
            />
          </CardContent>
        </Card>

        {/* Output */}
        {output && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-800 p-3 rounded text-green-400 text-sm font-mono whitespace-pre-wrap">
                {output}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Execution History */}
        {executionHistory.length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {executionHistory.slice(-5).map((result, index) => (
                  <div key={index} className="text-xs text-gray-400 border-b border-gray-700 pb-1">
                    <div className="flex justify-between">
                      <span>{result.userName}</span>
                      <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-green-400 truncate">{result.output}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}