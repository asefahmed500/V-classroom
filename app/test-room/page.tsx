"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, AlertCircle, CheckCircle } from "lucide-react"

export default function TestRoomPage() {
  const [testCode, setTestCode] = useState("68965f3a5d5c120f26be472b")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testRoomCode = async () => {
    if (!testCode.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/rooms/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: testCode.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || data.message || 'Unknown error')
      }
    } catch (error) {
      console.error('Test error:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const getAllRooms = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/rooms/debug')
      const data = await response.json()

      if (response.ok) {
        setResult({ type: 'debug', data })
      } else {
        setError(data.error || 'Failed to fetch rooms')
      }
    } catch (error) {
      console.error('Debug error:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Room Code Tester
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Enter room code or ID to test"
                className="font-mono"
              />
              <Button onClick={testRoomCode} disabled={loading}>
                {loading ? "Testing..." : "Test Code"}
              </Button>
              <Button onClick={getAllRooms} variant="outline" disabled={loading}>
                Get All Rooms
              </Button>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.type === 'debug' ? (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-900">All Rooms in Database</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Total Rooms:</strong> {result.data.totalRooms}</p>
                        {result.data.rooms?.map((room: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded border">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{room.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Code: <span className="font-mono">{room.roomCode}</span> 
                                  (Length: {room.codeLength})
                                </p>
                              </div>
                              <Badge variant="outline">
                                {room.participantCount} participants
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-900 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Room Found!
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <strong>Name:</strong> {result.room.name}
                          </div>
                          <div>
                            <strong>Subject:</strong> {result.room.subject}
                          </div>
                          <div>
                            <strong>Room Code:</strong> 
                            <span className="font-mono ml-2">{result.room.roomCode}</span>
                          </div>
                          <div>
                            <strong>Room ID:</strong> 
                            <span className="font-mono ml-2 text-xs">{result.room.id}</span>
                          </div>
                          <div>
                            <strong>Found By:</strong> 
                            <Badge variant="outline" className="ml-2">{result.foundBy}</Badge>
                          </div>
                          <div>
                            <strong>Active:</strong> 
                            <Badge variant={result.room.isActive ? "default" : "secondary"} className="ml-2">
                              {result.room.isActive ? "Yes" : "No"}
                            </Badge>
                          </div>
                        </div>
                        
                        {result.room.description && (
                          <div>
                            <strong>Description:</strong> {result.room.description}
                          </div>
                        )}
                        
                        <div className="pt-3 border-t">
                          <Button 
                            onClick={() => window.open(`/rooms/${result.room.id}`, '_blank')}
                            className="mr-2"
                          >
                            Open Room
                          </Button>
                          <Button 
                            onClick={() => window.open(`/join?code=${result.room.roomCode}`, '_blank')}
                            variant="outline"
                          >
                            Test Join
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => {
                  setTestCode("68965f3a5d5c120f26be472b")
                  setTimeout(testRoomCode, 100)
                }}
                variant="outline"
              >
                Test Your Code
              </Button>
              <Button 
                onClick={() => {
                  setTestCode("ABC123")
                  setTimeout(testRoomCode, 100)
                }}
                variant="outline"
              >
                Test Sample Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}