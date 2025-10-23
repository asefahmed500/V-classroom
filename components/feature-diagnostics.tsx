"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { io } from "socket.io-client"

interface FeatureTest {
  name: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
}

interface FeatureDiagnosticsProps {
  roomId: string
  userId: string
  userName: string
}

export function FeatureDiagnostics({ roomId, userId, userName }: FeatureDiagnosticsProps) {
  const [tests, setTests] = useState<FeatureTest[]>([
    { name: 'Socket.IO Connection', status: 'pending', message: 'Testing connection...' },
    { name: 'Chat API', status: 'pending', message: 'Testing chat functionality...' },
    { name: 'File Upload API', status: 'pending', message: 'Testing file upload...' },
    { name: 'AI Assistant API', status: 'pending', message: 'Testing AI assistant...' },
    { name: 'Whiteboard API', status: 'pending', message: 'Testing whiteboard...' },
    { name: 'Room API', status: 'pending', message: 'Testing room data...' },
  ])

  const updateTest = (name: string, status: FeatureTest['status'], message: string) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message } : test
    ))
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    // Test Socket.IO Connection
    try {
      const socket = io({
        path: "/socket.io/",
        transports: ["polling", "websocket"],
        timeout: 5000
      })

      socket.on('connect', () => {
        updateTest('Socket.IO Connection', 'success', 'Connected successfully')
        socket.disconnect()
      })

      socket.on('connect_error', (error) => {
        updateTest('Socket.IO Connection', 'error', `Connection failed: ${error.message}`)
      })

      setTimeout(() => {
        if (socket.connected === false) {
          updateTest('Socket.IO Connection', 'error', 'Connection timeout')
          socket.disconnect()
        }
      }, 5000)
    } catch (error) {
      updateTest('Socket.IO Connection', 'error', `Socket error: ${error}`)
    }

    // Test Chat API
    try {
      const response = await fetch(`/api/chat/messages?roomId=${roomId}&limit=1`)
      if (response.ok) {
        updateTest('Chat API', 'success', 'Chat API working')
      } else {
        updateTest('Chat API', 'error', `Chat API error: ${response.status}`)
      }
    } catch (error) {
      updateTest('Chat API', 'error', `Chat API failed: ${error}`)
    }

    // Test AI Assistant API
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Test message',
          context: { roomId, roomName: 'Test Room' }
        })
      })
      if (response.ok) {
        updateTest('AI Assistant API', 'success', 'AI Assistant working')
      } else {
        updateTest('AI Assistant API', 'error', `AI API error: ${response.status}`)
      }
    } catch (error) {
      updateTest('AI Assistant API', 'error', `AI API failed: ${error}`)
    }

    // Test Room API
    try {
      const response = await fetch(`/api/rooms/find-by-id/${roomId}`)
      if (response.ok) {
        updateTest('Room API', 'success', 'Room API working')
      } else {
        updateTest('Room API', 'error', `Room API error: ${response.status}`)
      }
    } catch (error) {
      updateTest('Room API', 'error', `Room API failed: ${error}`)
    }

    // Test File Upload API (mock test)
    try {
      const formData = new FormData()
      const testFile = new Blob(['test'], { type: 'text/plain' })
      formData.append('file', testFile, 'test.txt')
      formData.append('roomId', roomId)
      formData.append('userId', userId)
      formData.append('userName', userName)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        updateTest('File Upload API', 'success', 'File upload working')
      } else {
        updateTest('File Upload API', 'error', `File upload error: ${response.status}`)
      }
    } catch (error) {
      updateTest('File Upload API', 'error', `File upload failed: ${error}`)
    }

    // Test Whiteboard API
    try {
      const response = await fetch('/api/whiteboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId,
          imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          drawings: []
        })
      })
      
      if (response.ok) {
        updateTest('Whiteboard API', 'success', 'Whiteboard API working')
      } else {
        updateTest('Whiteboard API', 'error', `Whiteboard error: ${response.status}`)
      }
    } catch (error) {
      updateTest('Whiteboard API', 'error', `Whiteboard failed: ${error}`)
    }
  }

  const getStatusIcon = (status: FeatureTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusColor = (status: FeatureTest['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Feature Diagnostics</span>
          <Badge variant="outline">Room: {roomId.slice(-8)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tests.map((test) => (
          <div key={test.name} className={`p-4 rounded-lg border ${getStatusColor(test.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(test.status)}
                <span className="font-medium">{test.name}</span>
              </div>
              <Badge variant={test.status === 'success' ? 'default' : 'destructive'}>
                {test.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm opacity-80">{test.message}</p>
          </div>
        ))}
        
        <div className="mt-6 pt-4 border-t">
          <Button onClick={runDiagnostics} className="w-full">
            Run Diagnostics Again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}