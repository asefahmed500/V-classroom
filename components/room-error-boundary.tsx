"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface RoomErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface RoomErrorBoundaryProps {
  children: React.ReactNode
  roomId?: string
}

export class RoomErrorBoundary extends React.Component<RoomErrorBoundaryProps, RoomErrorBoundaryState> {
  constructor(props: RoomErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): RoomErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Room Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-900 p-6">
          <Card className="w-full max-w-md bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white">Room Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-300">
                Something went wrong while loading the room. This might be due to a connection issue or browser compatibility.
              </p>
              
              {this.state.error && (
                <details className="text-left">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                    Technical Details
                  </summary>
                  <pre className="text-xs text-red-400 mt-2 p-2 bg-gray-900 rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Room
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Back to Dashboard
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 mt-4">
                <p>If this problem persists, try:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Refreshing your browser</li>
                  <li>Checking your internet connection</li>
                  <li>Using a different browser</li>
                  <li>Clearing your browser cache</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}