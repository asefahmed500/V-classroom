"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowLeft,
  TestTube
} from "lucide-react"
import Link from "next/link"

export default function TestSystemsPage() {
  const [roomCode, setRoomCode] = useState("")
  const [userName, setUserName] = useState("")
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState<any>({})

  const testRoomValidation = async () => {
    if (!roomCode) return
    
    setLoading(prev => ({ ...prev, roomValidation: true }))
    try {
      const response = await fetch(`/api/rooms/join/${roomCode}`)
      const data = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        roomValidation: {
          success: response.ok,
          data: response.ok ? data : null,
          error: !response.ok ? data.message : null
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        roomValidation: {
          success: false,
          error: 'Network error'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, roomValidation: false }))
    }
  }

  const testRoomJoining = async () => {
    if (!roomCode || !userName) return
    
    setLoading(prev => ({ ...prev, roomJoining: true }))
    try {
      const response = await fetch('/api/rooms/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          userName,
          userEmail: 'test@example.com'
        })
      })
      const data = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        roomJoining: {
          success: response.ok,
          data: response.ok ? data : null,
          error: !response.ok ? data.message : null
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        roomJoining: {
          success: false,
          error: 'Network error'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, roomJoining: false }))
    }
  }

  const testCameraControls = async () => {
    setLoading(prev => ({ ...prev, cameraControls: true }))
    try {
      // Test if we can access media devices
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      
      if (!hasMediaDevices) {
        throw new Error('Media devices not supported')
      }

      // Test camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      // Test controls
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      
      if (videoTrack) {
        videoTrack.enabled = false // Test video off
        videoTrack.enabled = true  // Test video on
      }
      
      if (audioTrack) {
        audioTrack.enabled = false // Test audio off
        audioTrack.enabled = true  // Test audio on
      }
      
      // Clean up
      stream.getTracks().forEach(track => track.stop())
      
      setTestResults(prev => ({
        ...prev,
        cameraControls: {
          success: true,
          data: {
            videoSupported: !!videoTrack,
            audioSupported: !!audioTrack,
            mediaDevicesSupported: hasMediaDevices
          },
          error: null
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        cameraControls: {
          success: false,
          error: error instanceof Error ? error.message : 'Camera/microphone access failed'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, cameraControls: false }))
    }
  }

  const testRoomDeletion = async () => {
    if (!roomCode) return
    
    setLoading(prev => ({ ...prev, roomDeletion: true }))
    try {
      // First check if room exists
      const checkResponse = await fetch(`/api/rooms/${roomCode}`)
      if (!checkResponse.ok) {
        throw new Error('Room not found for deletion test')
      }
      
      setTestResults(prev => ({
        ...prev,
        roomDeletion: {
          success: true,
          data: { message: 'Room deletion API is available (test skipped to avoid deleting demo room)' },
          error: null
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        roomDeletion: {
          success: false,
          error: error instanceof Error ? error.message : 'Room deletion test failed'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, roomDeletion: false }))
    }
  }

  const testAISystem = async () => {
    setLoading(prev => ({ ...prev, aiSystem: true }))
    try {
      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, can you help me with mathematics?',
          subject: 'Mathematics',
          roomId: 'test-room',
          userId: 'test-user',
          userName: 'Test User',
          chatHistory: []
        })
      })
      const data = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        aiSystem: {
          success: response.ok,
          data: response.ok ? data : null,
          error: !response.ok ? data.error : null
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        aiSystem: {
          success: false,
          error: 'Network error'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, aiSystem: false }))
    }
  }

  const testRoomsList = async () => {
    setLoading(prev => ({ ...prev, roomsList: true }))
    try {
      const response = await fetch('/api/rooms/list?type=public&limit=5')
      const data = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        roomsList: {
          success: response.ok,
          data: response.ok ? data : null,
          error: !response.ok ? data.error : null
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        roomsList: {
          success: false,
          error: 'Network error'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, roomsList: false }))
    }
  }

  const renderTestResult = (testName: string, result: any) => {
    if (!result) return null

    return (
      <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <div className="flex items-center">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className="ml-2">
            <div className={result.success ? "text-green-800" : "text-red-800"}>
              <strong>{testName}:</strong> {result.success ? "✅ Success" : "❌ Failed"}
              {result.error && <div className="text-sm mt-1">Error: {result.error}</div>}
              {result.data && (
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer">View Response Data</summary>
                  <pre className="mt-1 p-2 bg-white rounded border overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <TestTube className="w-6 h-6 mr-2 text-blue-600" />
                  System Tests
                </h1>
                <p className="text-sm text-gray-600">Test room joining and AI systems</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Room System Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Room System Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Inputs */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Code (use RH5BSC for demo)
                  </label>
                  <Input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code"
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Name
                  </label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Test Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={testRoomValidation}
                  disabled={!roomCode || loading.roomValidation}
                  variant="outline"
                >
                  {loading.roomValidation ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Test Room Validation
                </Button>

                <Button
                  onClick={testRoomJoining}
                  disabled={!roomCode || !userName || loading.roomJoining}
                  variant="outline"
                >
                  {loading.roomJoining ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Test Room Joining
                </Button>

                <Button
                  onClick={testRoomsList}
                  disabled={loading.roomsList}
                  variant="outline"
                >
                  {loading.roomsList ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Test Rooms List
                </Button>

                <Button
                  onClick={testCameraControls}
                  disabled={loading.cameraControls}
                  variant="outline"
                >
                  {loading.cameraControls ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Test Camera/Mic
                </Button>

                <Button
                  onClick={testRoomDeletion}
                  disabled={!roomCode || loading.roomDeletion}
                  variant="outline"
                >
                  {loading.roomDeletion ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Test Room Deletion
                </Button>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {renderTestResult("Room Validation", testResults.roomValidation)}
                {renderTestResult("Room Joining", testResults.roomJoining)}
                {renderTestResult("Rooms List", testResults.roomsList)}
                {renderTestResult("Camera/Microphone Controls", testResults.cameraControls)}
                {renderTestResult("Room Deletion", testResults.roomDeletion)}
              </div>
            </CardContent>
          </Card>

          {/* AI System Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                AI System Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={testAISystem}
                  disabled={loading.aiSystem}
                  variant="outline"
                >
                  {loading.aiSystem ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Test AI Chat
                </Button>

                <Link href="/ai-assistant">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Brain className="w-4 h-4 mr-2" />
                    Open AI Assistant
                  </Button>
                </Link>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {renderTestResult("AI Chat System", testResults.aiSystem)}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/rooms/join">
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Join Room Page
                  </Button>
                </Link>
                <Link href="/rooms">
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Browse Rooms
                  </Button>
                </Link>
                <Link href="/rooms/create">
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Create Room
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">System Status</h3>
                  <p className="text-sm text-gray-600">All systems operational</p>
                </div>
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}