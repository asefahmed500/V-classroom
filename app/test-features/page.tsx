"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Wifi, 
  Video, 
  MessageSquare,
  FileText,
  Palette,
  FolderOpen,
  Users
} from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
  details?: string
}

export default function TestFeaturesPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Database Connection', status: 'pending', message: 'Testing...' },
    { name: 'Socket.IO Connection', status: 'pending', message: 'Testing...' },
    { name: 'Room Creation API', status: 'pending', message: 'Testing...' },
    { name: 'Room Join API', status: 'pending', message: 'Testing...' },
    { name: 'Chat Messages API', status: 'pending', message: 'Testing...' },
    { name: 'File Upload API', status: 'pending', message: 'Testing...' },
    { name: 'Notes API', status: 'pending', message: 'Testing...' },
    { name: 'Whiteboard API', status: 'pending', message: 'Testing...' },
    { name: 'WebRTC Support', status: 'pending', message: 'Testing...' },
    { name: 'Media Devices Access', status: 'pending', message: 'Testing...' }
  ])

  const updateTest = (name: string, status: 'success' | 'error', message: string, details?: string) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, details } : test
    ))
  }

  const runTests = async () => {
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: 'Testing...' })))

    // Test Database Connection
    try {
      const response = await fetch('/api/test/database')
      if (response.ok) {
        updateTest('Database Connection', 'success', 'MongoDB connected successfully')
      } else {
        updateTest('Database Connection', 'error', 'Database connection failed')
      }
    } catch (error) {
      updateTest('Database Connection', 'error', 'Database connection failed', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test Socket.IO Connection
    try {
      const socket = (await import('socket.io-client')).io()
      socket.on('connect', () => {
        updateTest('Socket.IO Connection', 'success', 'Socket.IO connected successfully')
        socket.disconnect()
      })
      socket.on('connect_error', () => {
        updateTest('Socket.IO Connection', 'error', 'Socket.IO connection failed')
      })
      
      setTimeout(() => {
        if (tests.find(t => t.name === 'Socket.IO Connection')?.status === 'pending') {
          updateTest('Socket.IO Connection', 'error', 'Socket.IO connection timeout')
        }
      }, 5000)
    } catch (error) {
      updateTest('Socket.IO Connection', 'error', 'Socket.IO connection failed', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test Room Creation API
    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Room',
          subject: 'Testing',
          description: 'Test room for feature testing'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        updateTest('Room Creation API', 'success', `Room created: ${data.roomId}`)
        
        // Test Room Join API
        const joinResponse = await fetch(`/api/rooms/join/${data.roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: 'Test User' })
        })
        
        if (joinResponse.ok) {
          updateTest('Room Join API', 'success', 'Successfully joined room')
        } else {
          updateTest('Room Join API', 'error', 'Failed to join room')
        }
      } else {
        updateTest('Room Creation API', 'error', 'Failed to create room')
        updateTest('Room Join API', 'error', 'Skipped - room creation failed')
      }
    } catch (error) {
      updateTest('Room Creation API', 'error', 'Room creation failed', error instanceof Error ? error.message : 'Unknown error')
      updateTest('Room Join API', 'error', 'Skipped - room creation failed')
    }

    // Test Chat Messages API
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: 'TEST123',
          userId: 'test-user',
          userName: 'Test User',
          message: 'Test message'
        })
      })
      
      if (response.ok) {
        updateTest('Chat Messages API', 'success', 'Message saved successfully')
      } else {
        updateTest('Chat Messages API', 'error', 'Failed to save message')
      }
    } catch (error) {
      updateTest('Chat Messages API', 'error', 'Chat API failed', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test File Upload API (mock test)
    try {
      const formData = new FormData()
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', testFile)
      formData.append('roomId', 'TEST123')
      formData.append('userId', 'test-user')
      formData.append('userName', 'Test User')
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        updateTest('File Upload API', 'success', 'File upload working')
      } else {
        updateTest('File Upload API', 'error', 'File upload failed')
      }
    } catch (error) {
      updateTest('File Upload API', 'error', 'File upload failed', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test Notes API
    try {
      const response = await fetch('/api/notes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: 'TEST123',
          content: 'Test notes content',
          userId: 'test-user',
          userName: 'Test User'
        })
      })
      
      if (response.ok) {
        updateTest('Notes API', 'success', 'Notes saved successfully')
      } else {
        updateTest('Notes API', 'error', 'Failed to save notes')
      }
    } catch (error) {
      updateTest('Notes API', 'error', 'Notes API failed', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test Whiteboard API
    try {
      const response = await fetch('/api/whiteboard/TEST123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawData: { type: 'test', data: 'test' },
          action: 'add'
        })
      })
      
      if (response.ok) {
        updateTest('Whiteboard API', 'success', 'Whiteboard data saved')
      } else {
        updateTest('Whiteboard API', 'error', 'Whiteboard API failed')
      }
    } catch (error) {
      updateTest('Whiteboard API', 'error', 'Whiteboard API failed', error instanceof Error ? error.message : 'Unknown error')
    }

    // Test WebRTC Support
    if (typeof window !== 'undefined') {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        updateTest('WebRTC Support', 'success', 'WebRTC is supported')
        
        // Test Media Devices Access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          updateTest('Media Devices Access', 'success', 'Camera and microphone access granted')
          stream.getTracks().forEach(track => track.stop())
        } catch (error) {
          updateTest('Media Devices Access', 'error', 'Media access denied or unavailable')
        }
      } else {
        updateTest('WebRTC Support', 'error', 'WebRTC not supported')
        updateTest('Media Devices Access', 'error', 'Skipped - WebRTC not supported')
      }
    }
  }

  useEffect(() => {
    runTests()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 border-green-200'
      case 'error':
        return 'bg-red-100 border-red-200'
      default:
        return 'bg-yellow-100 border-yellow-200'
    }
  }

  const successCount = tests.filter(t => t.status === 'success').length
  const errorCount = tests.filter(t => t.status === 'error').length
  const pendingCount = tests.filter(t => t.status === 'pending').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Feature Testing Dashboard</h1>
          <p className="text-lg text-gray-600 mb-6">
            Comprehensive testing of all Virtual Study Rooms features
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-1" />
              {successCount} Passed
            </Badge>
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="w-4 h-4 mr-1" />
              {errorCount} Failed
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800">
              <Clock className="w-4 h-4 mr-1" />
              {pendingCount} Pending
            </Badge>
          </div>

          <Button onClick={runTests} className="mb-8">
            Run Tests Again
          </Button>
        </div>

        <div className="grid gap-4">
          {tests.map((test, index) => (
            <Card key={index} className={`${getStatusColor(test.status)} border-2`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{test.name}</h3>
                      <p className="text-sm text-gray-600">{test.message}</p>
                      {test.details && (
                        <p className="text-xs text-gray-500 mt-1">{test.details}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={test.status === 'success' ? 'default' : test.status === 'error' ? 'destructive' : 'secondary'}>
                      {test.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Feature Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <Video className="w-4 h-4 mr-2" />
                  Multi-user Video Chat
                </span>
                <Badge variant="default">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <Palette className="w-4 h-4 mr-2" />
                  Collaborative Whiteboard
                </span>
                <Badge variant="default">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Study Timer
                </span>
                <Badge variant="default">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  File Sharing
                </span>
                <Badge variant="default">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Collaborative Notes
                </span>
                <Badge variant="default">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Live Chat
                </span>
                <Badge variant="default">Ready</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Database Connection</span>
                <Badge variant={tests.find(t => t.name === 'Database Connection')?.status === 'success' ? 'default' : 'destructive'}>
                  {tests.find(t => t.name === 'Database Connection')?.status || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Real-time Communication</span>
                <Badge variant={tests.find(t => t.name === 'Socket.IO Connection')?.status === 'success' ? 'default' : 'destructive'}>
                  {tests.find(t => t.name === 'Socket.IO Connection')?.status || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>WebRTC Support</span>
                <Badge variant={tests.find(t => t.name === 'WebRTC Support')?.status === 'success' ? 'default' : 'destructive'}>
                  {tests.find(t => t.name === 'WebRTC Support')?.status || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Media Access</span>
                <Badge variant={tests.find(t => t.name === 'Media Devices Access')?.status === 'success' ? 'default' : 'destructive'}>
                  {tests.find(t => t.name === 'Media Devices Access')?.status || 'Unknown'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}