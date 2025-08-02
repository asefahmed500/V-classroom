"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Database, 
  Shield, 
  Brain, 
  Video,
  Mail,
  MessageSquare,
  Users,
  FileText,
  Clock
} from "lucide-react"

interface TestResult {
  name: string
  status: "success" | "error" | "pending" | "idle"
  message?: string
  details?: any
}

export default function TestPage() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [emailTest, setEmailTest] = useState({ to: "", subject: "Test Email", message: "This is a test email from Virtual Study Rooms." })

  const updateTest = (name: string, status: "success" | "error" | "pending", message?: string, details?: any) => {
    setTests((prev) => {
      const existing = prev.find((t) => t.name === name)
      if (existing) {
        existing.status = status
        existing.message = message
        existing.details = details
        return [...prev]
      } else {
        return [...prev, { name, status, message, details }]
      }
    })
  }

  const runTest = async (name: string, url: string, method: "GET" | "POST" = "GET", body?: any) => {
    updateTest(name, "pending")
    try {
      const response = await fetch(url, { 
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await response.json()

      if (response.ok) {
        updateTest(name, "success", "Test passed", data)
      } else {
        updateTest(name, "error", data.message || "Test failed", data)
      }
    } catch (error) {
      updateTest(name, "error", error instanceof Error ? error.message : "Network error")
    }
  }

  const testEmailSending = async () => {
    if (!emailTest.to) {
      alert("Please enter an email address")
      return
    }

    updateTest("Email Service", "pending")
    try {
      const response = await fetch("/api/test/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailTest),
      })

      const data = await response.json()
      if (response.ok) {
        updateTest("Email Service", "success", "Email sent successfully", data)
      } else {
        updateTest("Email Service", "error", data.message || "Failed to send email", data)
      }
    } catch (error) {
      updateTest("Email Service", "error", error instanceof Error ? error.message : "Network error")
    }
  }

  const runAllTests = async () => {
    setRunning(true)
    setTests([])

    // System tests
    await runTest("Health Check", "/api/health")
    await runTest("Database Connection", "/api/test/database")
    
    // Auth tests
    await runTest("User Registration", "/api/test/auth", "POST")
    
    // Room tests
    await runTest("Room Creation", "/api/test/room", "POST")
    await runTest("Get Rooms", "/api/rooms")
    
    // Socket.io test
    updateTest("Socket.io Server", "pending")
    try {
      const response = await fetch("/api/socketio")
      if (response.ok) {
        updateTest("Socket.io Server", "success", "Socket.io server is running")
      } else {
        updateTest("Socket.io Server", "error", "Socket.io server not responding")
      }
    } catch (error) {
      updateTest("Socket.io Server", "error", "Failed to connect to Socket.io server")
    }

    setRunning(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "pending":
        return <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Passed</Badge>
      case "error":
        return <Badge variant="destructive">Failed</Badge>
      case "pending":
        return <Badge variant="secondary">Running...</Badge>
      default:
        return <Badge variant="outline">Not Run</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Virtual Study Rooms - System Test Dashboard</h1>
          <p className="text-gray-600">Comprehensive testing suite to verify all features are working correctly</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runAllTests} disabled={running} size="lg" className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  {running ? "Running Tests..." : "Run All System Tests"}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => runTest("Health Check", "/api/health")} 
                    variant="outline" 
                    size="sm"
                  >
                    Health Check
                  </Button>
                  <Button 
                    onClick={() => runTest("Database", "/api/test/database")} 
                    variant="outline" 
                    size="sm"
                  >
                    Database Test
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email Service Test
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Test Email Address</label>
                  <Input
                    type="email"
                    placeholder="your-email@example.com"
                    value={emailTest.to}
                    onChange={(e) => setEmailTest({ ...emailTest, to: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={emailTest.subject}
                    onChange={(e) => setEmailTest({ ...emailTest, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={emailTest.message}
                    onChange={(e) => setEmailTest({ ...emailTest, message: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={testEmailSending} className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/dashboard">
                    <Users className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/rooms/create">
                    <Video className="w-4 h-4 mr-2" />
                    Create Test Room
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/ai-assistant">
                    <Brain className="w-4 h-4 mr-2" />
                    Test AI Assistant
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          <div className="space-y-6">
            {/* System Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  System Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tests
                    .filter((test) => ["Health Check", "Database Connection", "Socket.io Server"].includes(test.name))
                    .map((test) => (
                      <div key={test.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(test.status)}
                          <span className="font-medium">{test.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">{getStatusBadge(test.status)}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Feature Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tests
                    .filter((test) => ["User Registration", "Room Creation", "Get Rooms", "Email Service"].includes(test.name))
                    .map((test) => (
                      <div key={test.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(test.status)}
                          <span className="font-medium">{test.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">{getStatusBadge(test.status)}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Test Results Details */}
            {tests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tests.map((test) => (
                      <div key={test.name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{test.name}</h4>
                          {getStatusBadge(test.status)}
                        </div>
                        {test.message && <p className="text-sm text-gray-600 mb-2">{test.message}</p>}
                        {test.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600">View Details</summary>
                            <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>App URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}
              </div>
              <div>
                <strong>Socket URL:</strong> {process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"}
              </div>
              <div>
                <strong>Environment:</strong> {process.env.NODE_ENV || "development"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}