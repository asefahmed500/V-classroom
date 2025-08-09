"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function TestRoomFixPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      // Step 1: Create a test room
      console.log('🧪 Step 1: Creating test room...')
      const createResponse = await fetch('/api/test-room-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create test room')
      }

      const createResult = await createResponse.json()
      console.log('✅ Room created:', createResult)

      // Step 2: Fetch the room by ID
      console.log('🧪 Step 2: Fetching room by ID...')
      const fetchResponse = await fetch(`/api/rooms/${createResult.created.id}`)
      
      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch room by ID')
      }

      const fetchResult = await fetchResponse.json()
      console.log('✅ Room fetched:', fetchResult)

      // Step 3: Test room code lookup
      console.log('🧪 Step 3: Testing room code lookup...')
      const lookupResponse = await fetch('/api/rooms/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: createResult.created.roomCode })
      })

      let lookupResult = null
      if (lookupResponse.ok) {
        lookupResult = await lookupResponse.json()
        console.log('✅ Room lookup successful:', lookupResult)
      } else {
        console.warn('⚠️ Room lookup failed')
      }

      // Compile test results
      setTestResult({
        creation: createResult,
        fetch: fetchResult,
        lookup: lookupResult,
        tests: {
          roomCodeGenerated: !!createResult.created.roomCode,
          roomCodeIs6Digits: createResult.created.roomCode?.length === 6,
          roomCodeInFetch: !!fetchResult.roomCode,
          roomCodeMatches: createResult.created.roomCode === fetchResult.roomCode,
          lookupWorks: !!lookupResult?.success
        }
      })

    } catch (error) {
      console.error('❌ Test failed:', error)
      setError(error instanceof Error ? error.message : 'Test failed')
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
              <RefreshCw className="w-5 h-5 mr-2" />
              Room Code Fix Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              This test will create a room, fetch it back, and verify that the room code is working correctly.
            </p>
            
            <Button onClick={runTest} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                'Run Room Code Test'
              )}
            </Button>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {testResult && (
              <div className="space-y-4">
                {/* Test Results Summary */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        {testResult.tests.roomCodeGenerated ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span>Room code generated</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {testResult.tests.roomCodeIs6Digits ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span>Room code is 6 digits</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {testResult.tests.roomCodeInFetch ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span>Room code in API response</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {testResult.tests.roomCodeMatches ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span>Room codes match</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {testResult.tests.lookupWorks ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span>Room code lookup works</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Results */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Room Creation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Room ID:</strong> 
                          <div className="font-mono text-xs break-all">{testResult.creation.created.id}</div>
                        </div>
                        <div>
                          <strong>Room Code:</strong> 
                          <Badge variant="outline" className="ml-2 font-mono">
                            {testResult.creation.created.roomCode}
                          </Badge>
                        </div>
                        <div>
                          <strong>Name:</strong> {testResult.creation.created.name}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Room Fetch</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Room ID:</strong> 
                          <div className="font-mono text-xs break-all">{testResult.fetch.id}</div>
                        </div>
                        <div>
                          <strong>Room Code:</strong> 
                          <Badge variant="outline" className="ml-2 font-mono">
                            {testResult.fetch.roomCode}
                          </Badge>
                        </div>
                        <div>
                          <strong>Name:</strong> {testResult.fetch.name}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Room Lookup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {testResult.lookup ? (
                          <>
                            <div>
                              <strong>Found By:</strong> 
                              <Badge variant="outline" className="ml-2">
                                {testResult.lookup.foundBy}
                              </Badge>
                            </div>
                            <div>
                              <strong>Room Code:</strong> 
                              <Badge variant="outline" className="ml-2 font-mono">
                                {testResult.lookup.room.roomCode}
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <div className="text-red-600">Lookup failed</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => window.open(`/rooms/${testResult.creation.created.id}`, '_blank')}
                    variant="outline"
                  >
                    Open Test Room
                  </Button>
                  <Button 
                    onClick={() => window.open(`/join?code=${testResult.creation.created.roomCode}`, '_blank')}
                    variant="outline"
                  >
                    Test Join with Code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}