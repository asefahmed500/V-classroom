"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Palette, Eraser, Square, Circle, Minus, RotateCcw, Share, Download, Upload, Users, Eye } from "lucide-react"
import { Socket } from "socket.io-client"

interface WhiteboardProps {
  socket: Socket | null
  roomId: string
  userId: string
  userName: string
}

export function CollaborativeWhiteboard({ socket, roomId, userId, userName }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser' | 'line' | 'rectangle' | 'circle'>('pen')
  const [color, setColor] = useState('#ffffff')
  const [lineWidth, setLineWidth] = useState(2)
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [whiteboardData, setWhiteboardData] = useState<any[]>([])
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Join whiteboard session
    socket.emit('join-whiteboard', { roomId, userId, userName })

    socket.on('whiteboard-update', (data) => {
      drawOnCanvas(data)
      setWhiteboardData(prev => [...prev, data])
    })

    socket.on('whiteboard-clear', () => {
      clearCanvas()
      setWhiteboardData([])
    })

    socket.on('whiteboard-shared', (data) => {
      // Load shared whiteboard data
      clearCanvas()
      setWhiteboardData(data.whiteboardData)
      data.whiteboardData.forEach(drawData => drawOnCanvas(drawData))
    })

    socket.on('user-drawing', ({ userName: drawingUserName }) => {
      setActiveUsers(prev => {
        if (!prev.includes(drawingUserName)) {
          return [...prev, drawingUserName]
        }
        return prev
      })
      
      // Remove user from active list after 3 seconds
      setTimeout(() => {
        setActiveUsers(prev => prev.filter(name => name !== drawingUserName))
      }, 3000)
    })

    return () => {
      socket.off('whiteboard-update')
      socket.off('whiteboard-clear')
      socket.off('whiteboard-shared')
      socket.off('user-drawing')
    }
  }, [socket])

  const drawOnCanvas = (data: any) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = data.color
    ctx.lineWidth = data.lineWidth
    ctx.lineCap = 'round'

    if (data.type === 'draw') {
      ctx.beginPath()
      ctx.moveTo(data.prevX, data.prevY)
      ctx.lineTo(data.x, data.y)
      ctx.stroke()
    } else if (data.type === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(data.x, data.y, data.lineWidth, 0, 2 * Math.PI)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (socket) {
      socket.emit('user-drawing', { roomId, userId, userName })
    }
  }

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, lineWidth, 0, 2 * Math.PI)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      
      if (socket) {
        socket.emit('whiteboard-update', {
          roomId,
          type: 'erase',
          x,
          y,
          lineWidth,
          userId,
          userName
        })
      }
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(x - 1, y - 1)
      ctx.lineTo(x, y)
      ctx.stroke()

      if (socket) {
        socket.emit('whiteboard-update', {
          roomId,
          type: 'draw',
          x,
          y,
          prevX: x - 1,
          prevY: y - 1,
          color,
          lineWidth,
          tool,
          userId,
          userName
        })
      }
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleClear = () => {
    clearCanvas()
    setWhiteboardData([])
    if (socket) {
      socket.emit('whiteboard-clear', { roomId, userId, userName })
    }
  }

  const handleShare = () => {
    if (!socket) return
    
    setIsSharing(true)
    socket.emit('share-whiteboard', {
      roomId,
      whiteboardData,
      userId,
      userName
    })
    
    setTimeout(() => setIsSharing(false), 2000)
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `whiteboard-${roomId}-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageData = canvas.toDataURL()
    localStorage.setItem(`whiteboard-${roomId}`, JSON.stringify({
      imageData,
      whiteboardData,
      timestamp: Date.now()
    }))
  }

  const handleLoad = () => {
    const saved = localStorage.getItem(`whiteboard-${roomId}`)
    if (!saved) return

    try {
      const { imageData, whiteboardData: savedData } = JSON.parse(saved)
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        clearCanvas()
        ctx.drawImage(img, 0, 0)
        setWhiteboardData(savedData || [])
      }
      img.src = imageData
    } catch (error) {
      console.error('Failed to load whiteboard:', error)
    }
  }

  const colors = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffa500', '#800080']

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Collaborative Whiteboard</h3>
          <div className="flex items-center space-x-2">
            {activeUsers.length > 0 && (
              <Badge variant="secondary" className="bg-green-600 text-white">
                <Users className="w-3 h-3 mr-1" />
                {activeUsers.length} drawing
              </Badge>
            )}
            <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
              <Eye className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
        
        {/* Active users indicator */}
        {activeUsers.length > 0 && (
          <div className="mb-4 p-2 bg-gray-700 rounded">
            <div className="text-xs text-gray-300 mb-1">Currently drawing:</div>
            <div className="flex flex-wrap gap-1">
              {activeUsers.map(user => (
                <Badge key={user} variant="secondary" className="text-xs bg-green-600 text-white">
                  {user}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Tools */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={tool === 'pen' ? 'default' : 'outline'}
            onClick={() => setTool('pen')}
            className="text-xs"
          >
            <Palette className="w-3 h-3 mr-1" />
            Pen
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'default' : 'outline'}
            onClick={() => setTool('eraser')}
            className="text-xs"
          >
            <Eraser className="w-3 h-3 mr-1" />
            Eraser
          </Button>
          <Button
            size="sm"
            onClick={handleClear}
            variant="destructive"
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        </div>

        {/* Sharing Tools */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
            className="text-xs bg-green-600 hover:bg-green-700"
          >
            <Share className="w-3 h-3 mr-1" />
            {isSharing ? 'Sharing...' : 'Share Board'}
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            variant="outline"
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            variant="outline"
            className="text-xs"
          >
            Save
          </Button>
          <Button
            size="sm"
            onClick={handleLoad}
            variant="outline"
            className="text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Load
          </Button>
        </div>

        {/* Colors */}
        <div className="flex flex-wrap gap-1 mb-4">
          {colors.map((c) => (
            <button
              key={c}
              className={`w-6 h-6 rounded border-2 ${
                color === c ? 'border-blue-400' : 'border-gray-600'
              }`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* Line Width */}
        <div className="mb-4">
          <label className="text-white text-xs mb-2 block">Brush Size</label>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <Card className="bg-white h-full">
          <CardContent className="p-0 h-full">
            <canvas
              ref={canvasRef}
              width={300}
              height={400}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}