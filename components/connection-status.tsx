"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react"
import { socketManager } from "@/lib/socket-client"
import { connectionFallback } from "@/lib/connection-fallback"

interface ConnectionStatusProps {
  socket: any
  participantCount: number
}

export function ConnectionStatus({ socket, participantCount }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'socket' | 'fallback' | 'disconnected'>('disconnected')
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const checkConnection = () => {
      const socketConnected = socket?.connected || false
      const fallbackActive = connectionFallback.isFallbackActive()
      
      setIsConnected(socketConnected || fallbackActive)
      
      if (socketConnected) {
        setConnectionType('socket')
      } else if (fallbackActive) {
        setConnectionType('fallback')
      } else {
        setConnectionType('disconnected')
      }
    }

    // Initial check
    checkConnection()

    // Check every 2 seconds
    const interval = setInterval(checkConnection, 2000)

    return () => clearInterval(interval)
  }, [socket])

  const handleReconnect = async () => {
    setIsReconnecting(true)
    try {
      await socketManager.forceReconnect()
      setTimeout(() => setIsReconnecting(false), 2000)
    } catch (error) {
      console.error('Reconnection failed:', error)
      setIsReconnecting(false)
    }
  }

  const getStatusColor = () => {
    switch (connectionType) {
      case 'socket': return 'bg-green-400'
      case 'fallback': return 'bg-yellow-400'
      case 'disconnected': return 'bg-red-400 animate-pulse'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = () => {
    switch (connectionType) {
      case 'socket': return 'Connected'
      case 'fallback': return 'Limited Connection'
      case 'disconnected': return 'Disconnected'
      default: return 'Unknown'
    }
  }

  const getStatusIcon = () => {
    switch (connectionType) {
      case 'socket': return <Wifi className="w-3 h-3" />
      case 'fallback': return <AlertTriangle className="w-3 h-3" />
      case 'disconnected': return <WifiOff className="w-3 h-3" />
      default: return <WifiOff className="w-3 h-3" />
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
        {getStatusIcon()}
        <span className="ml-1">{participantCount}</span>
      </Badge>
      
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-xs text-gray-400">
          {getStatusText()}
        </span>
        
        {connectionType === 'fallback' && (
          <span className="text-xs text-yellow-400">
            (Polling Mode)
          </span>
        )}
        
        {participantCount > 0 && (
          <span className="text-xs text-gray-400">
            • {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {connectionType === 'disconnected' && (
        <Button
          onClick={handleReconnect}
          disabled={isReconnecting}
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white h-6 px-2"
        >
          <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  )
}