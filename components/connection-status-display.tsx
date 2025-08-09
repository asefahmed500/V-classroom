"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Wifi, 
  WifiOff, 
  Users, 
  Clock, 
  Monitor, 
  Smartphone, 
  Tablet,
  Chrome,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"

interface Connection {
  connectionId: string
  userId: string
  userName: string
  isGuest: boolean
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  mediaState: {
    video: boolean
    audio: boolean
    screenShare: boolean
  }
  connectedAt: string
  lastSeen: string
  sessionData: {
    deviceType: 'desktop' | 'mobile' | 'tablet'
    browser: string
    permissions: {
      canShare: boolean
      canChat: boolean
      canUseWhiteboard: boolean
      canManageRoom: boolean
    }
  }
}

interface ConnectionStatusDisplayProps {
  roomId: string
  currentUserId?: string
  className?: string
}

export function ConnectionStatusDisplay({ 
  roomId, 
  currentUserId,
  className = "" 
}: ConnectionStatusDisplayProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnections = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/rooms/${roomId}/connections`)
      
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch connections')
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
    
    // Refresh connections every 10 seconds
    const interval = setInterval(fetchConnections, 10000)
    return () => clearInterval(interval)
  }, [roomId])

  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDeviceIcon = (deviceType: Connection['sessionData']['deviceType']) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    return date.toLocaleDateString()
  }

  const activeConnections = connections.filter(conn => 
    conn.status === 'connected' || conn.status === 'reconnecting'
  )

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span>Loading connections...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Active Connections ({activeConnections.length})
          </CardTitle>
          <Button
            onClick={fetchConnections}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {connections.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No active connections</p>
            </div>
          ) : (
            connections.map((connection) => (
              <div 
                key={connection.connectionId}
                className={`p-3 rounded-lg border transition-all ${
                  connection.userId === currentUserId 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                        {getInitials(connection.userName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {connection.userName}
                          {connection.userId === currentUserId && (
                            <span className="text-blue-600 ml-1">(You)</span>
                          )}
                        </span>
                        {connection.isGuest && (
                          <Badge variant="secondary" className="text-xs">Guest</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(connection.status)}`}
                        >
                          {getStatusIcon(connection.status)}
                          <span className="ml-1 capitalize">{connection.status}</span>
                        </Badge>
                        
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          {getDeviceIcon(connection.sessionData.deviceType)}
                          <span>{connection.sessionData.browser}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatTime(connection.lastSeen)}
                    </div>
                    
                    {/* Media State Indicators */}
                    <div className="flex items-center space-x-1 mt-1">
                      {connection.mediaState.video && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Video on" />
                      )}
                      {connection.mediaState.audio && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" title="Audio on" />
                      )}
                      {connection.mediaState.screenShare && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full" title="Screen sharing" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Connection Summary */}
        {connections.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-green-600">
                  {connections.filter(c => c.status === 'connected').length}
                </div>
                <div className="text-gray-500">Connected</div>
              </div>
              <div>
                <div className="font-semibold text-yellow-600">
                  {connections.filter(c => c.status === 'reconnecting').length}
                </div>
                <div className="text-gray-500">Reconnecting</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">
                  {connections.filter(c => c.status === 'disconnected').length}
                </div>
                <div className="text-gray-500">Disconnected</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}