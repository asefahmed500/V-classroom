"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Wifi,
  WifiOff,
  Server,
  Database
} from "lucide-react"

interface SystemStatus {
  api: 'online' | 'offline' | 'checking'
  database: 'online' | 'offline' | 'checking'
  auth: 'online' | 'offline' | 'checking'
}

export function ErrorRecovery() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: 'checking',
    database: 'checking',
    auth: 'checking'
  })
  const [isRecovering, setIsRecovering] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  useEffect(() => {
    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkSystemStatus = async () => {
    setSystemStatus({
      api: 'checking',
      database: 'checking',
      auth: 'checking'
    })

    // Check API health
    try {
      const healthResponse = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      })
      setSystemStatus(prev => ({
        ...prev,
        api: healthResponse.ok ? 'online' : 'offline',
        database: healthResponse.ok ? 'online' : 'offline'
      }))
    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        api: 'offline',
        database: 'offline'
      }))
    }

    // Check Auth
    try {
      const authResponse = await fetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-cache'
      })
      setSystemStatus(prev => ({
        ...prev,
        auth: authResponse.ok ? 'online' : 'offline'
      }))
    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        auth: 'offline'
      }))
    }

    setLastCheck(new Date())
  }

  const handleRecovery = async () => {
    setIsRecovering(true)
    
    // Wait a moment for visual feedback
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Refresh the page to restart everything
    window.location.reload()
  }

  const getStatusIcon = (status: 'online' | 'offline' | 'checking') => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
    }
  }

  const getStatusColor = (status: 'online' | 'offline' | 'checking') => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'offline':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'checking':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  const allSystemsOnline = Object.values(systemStatus).every(status => status === 'online')
  const anySystemOffline = Object.values(systemStatus).some(status => status === 'offline')

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-gray-900">System Recovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Status */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">API Server</span>
                </div>
                <Badge className={getStatusColor(systemStatus.api)}>
                  {getStatusIcon(systemStatus.api)}
                  <span className="ml-1 capitalize">{systemStatus.api}</span>
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge className={getStatusColor(systemStatus.database)}>
                  {getStatusIcon(systemStatus.database)}
                  <span className="ml-1 capitalize">{systemStatus.database}</span>
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Authentication</span>
                </div>
                <Badge className={getStatusColor(systemStatus.auth)}>
                  {getStatusIcon(systemStatus.auth)}
                  <span className="ml-1 capitalize">{systemStatus.auth}</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {allSystemsOnline && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                All systems are operational. You can continue using the application.
              </AlertDescription>
            </Alert>
          )}

          {anySystemOffline && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Some systems are experiencing issues. This may affect functionality.
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Actions */}
          <div className="space-y-3">
            <Button
              onClick={checkSystemStatus}
              variant="outline"
              className="w-full"
              disabled={Object.values(systemStatus).some(status => status === 'checking')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check System Status
            </Button>

            <Button
              onClick={handleRecovery}
              disabled={isRecovering}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Recovering...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart Application
                </>
              )}
            </Button>
          </div>

          {/* Last Check Info */}
          <div className="text-center text-sm text-gray-600">
            <p>Last checked: {lastCheck.toLocaleTimeString()}</p>
            <p>Systems are checked automatically every 30 seconds</p>
          </div>

          {/* Alternative Actions */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-2">Alternative Actions</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Go to Homepage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/rooms'}
                className="w-full"
              >
                Browse Public Rooms
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}